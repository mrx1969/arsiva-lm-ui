const ADMIN_EDITABLE_SETTINGS = Object.freeze([
  'MAX_FILE_SIZE_BYTES',
  'SEARCH_CACHE_SECONDS',
  'REMINDER_HOURS',
  'ESCALATION_HOURS',
  'PHYSICAL_CAPACITY_WARNING_PERCENT',
  'PRIMARY_STORAGE_LOCATION_NAME'
]);

function getAdminBootstrap_() {
  const db = getDatabase_();
  const actor = requireSuperAdmin_(db);
  const divisions = readObjects_(SHEETS.DIVISIONS, db);
  const units = readObjects_(SHEETS.UNITS, db);
  const categories = readObjects_(SHEETS.CATEGORIES, db);
  const users = readObjects_(SHEETS.USERS, db);
  const locations = readObjects_(SHEETS.STORAGE_LOCATIONS, db);
  const boxes = readObjects_(SHEETS.STORAGE_BOXES, db);
  const settings = readObjects_(SHEETS.SETTINGS, db).filter(function (item) {
    return ADMIN_EDITABLE_SETTINGS.indexOf(String(item.key)) >= 0;
  });

  return {
    actor: { id: actor.id, email: actor.email },
    divisions: divisions,
    units: units,
    categories: categories,
    users: users.map(function (user) {
      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        division_id: user.division_id || '',
        unit_id: user.unit_id || '',
        is_active: isTruthyCell_(user.is_active),
        updated_at: user.updated_at,
        row_version: Number(user.row_version) || 1
      };
    }),
    locations: locations,
    boxes: boxes,
    settings: settings
  };
}

function saveAdminRecord_(entity, payload) {
  const normalizedEntity = String(entity || '').toLowerCase();
  const input = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(APP.LOCK_TIMEOUT_MS);

  try {
    const db = getDatabase_();
    const actor = requireSuperAdmin_(db);
    if (normalizedEntity === 'setting') {
      return saveAdminSetting_(input, db, actor);
    }

    const config = getAdminEntityConfig_(normalizedEntity);
    const rows = readObjects_(config.sheet, db);
    const record = config.normalize(input, rows, db);
    const existingIndex = input.id
      ? rows.findIndex(function (item) { return String(item.id) === String(input.id); })
      : -1;
    const timestamp = nowIso_();
    let before = null;

    if (existingIndex >= 0) {
      before = rows[existingIndex];
      assertRowVersion_(input, before);
      record.id = before.id;
      record.created_at = before.created_at;
      record.updated_at = timestamp;
      record.row_version = (Number(before.row_version) || 0) + 1;
      writeObjectAtRow_(config.sheet, existingIndex + 2, Object.assign({}, before, record), db);
    } else {
      record.id = uuid_();
      record.created_at = timestamp;
      record.updated_at = timestamp;
      record.row_version = 1;
      appendObjects_(config.sheet, [record], db);
    }

    incrementDataVersion_(db, actor.email);
    invalidateDataVersionCache_();
    if (normalizedEntity === 'user') {
      if (before && before.email) CacheService.getUserCache().remove('current-user:' + String(before.email).toLowerCase());
      CacheService.getUserCache().remove('current-user:' + String(record.email).toLowerCase());
    }
    appendAudit_({
      actor_user_id: actor.id,
      actor_email_snapshot: actor.email,
      action: before ? 'ADMIN_UPDATE' : 'ADMIN_CREATE',
      entity_type: config.entityType,
      entity_id: record.id,
      before: before,
      after: record
    }, db);

    return { entity: normalizedEntity, record: record };
  } finally {
    lock.releaseLock();
  }
}

function listAuditLogs_(input) {
  const options = input || {};
  const pageSize = clampInteger_(options.page_size, 20, 10, 100);
  const db = getDatabase_();
  requireSuperAdmin_(db);
  const sheet = getSheet_(SHEETS.AUDIT_LOGS, db);
  const schema = getSchema_(SHEETS.AUDIT_LOGS);
  const total = Math.max(sheet.getLastRow() - 1, 0);
  const lastPage = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(clampInteger_(options.page, 1, 1, 100000), lastPage);
  const newestOffset = (page - 1) * pageSize;
  const newestDataIndex = total - newestOffset;
  const count = Math.max(Math.min(pageSize, newestDataIndex), 0);
  const rows = count === 0
    ? []
    : sheet.getRange(2 + newestDataIndex - count, 1, count, schema.length).getValues()
      .map(function (row) { return rowToObject_(schema, row); })
      .reverse();

  return {
    rows: rows.map(function (item) {
      return {
        id: item.id,
        occurred_at: item.occurred_at,
        actor_email: item.actor_email_snapshot,
        action: item.action,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        request_id: item.request_id
      };
    }),
    pagination: {
      current_page: page,
      page_size: pageSize,
      total: total,
      last_page: lastPage
    }
  };
}

function requireSuperAdmin_(spreadsheet) {
  const actor = getCurrentUser_(spreadsheet);
  assert_(actor.role === ROLES.SUPER_ADMIN, 'FORBIDDEN', 'Fitur ini hanya tersedia untuk Super Admin.');
  return actor;
}

function getAdminEntityConfig_(entity) {
  const configs = {
    division: { sheet: SHEETS.DIVISIONS, entityType: 'Division', normalize: normalizeDivisionRecord_ },
    unit: { sheet: SHEETS.UNITS, entityType: 'Unit', normalize: normalizeUnitRecord_ },
    category: { sheet: SHEETS.CATEGORIES, entityType: 'Category', normalize: normalizeCategoryRecord_ },
    user: { sheet: SHEETS.USERS, entityType: 'User', normalize: normalizeUserRecord_ },
    location: { sheet: SHEETS.STORAGE_LOCATIONS, entityType: 'StorageLocation', normalize: normalizeLocationRecord_ },
    box: { sheet: SHEETS.STORAGE_BOXES, entityType: 'StorageBox', normalize: normalizeBoxRecord_ }
  };
  const config = configs[entity];
  assert_(config, 'VALIDATION_ERROR', 'Jenis master data tidak didukung.');
  return config;
}

function normalizeDivisionRecord_(input, rows) {
  const code = normalizeAdminCode_(input.code, 'Kode divisi');
  assertUniqueAdminField_(rows, input.id, 'code', code, 'Kode divisi sudah digunakan.');
  return {
    code: code,
    name: requireAdminText_(input.name, 'Nama divisi', 120),
    drive_group_email: optionalAdminText_(input.drive_group_email, 160).toLowerCase(),
    active_folder_id: optionalAdminText_(input.active_folder_id, 200),
    archive_number_format: optionalAdminText_(input.archive_number_format, 120) || '{DIVISION}/{YEAR}/{SEQUENCE:5}',
    is_active: input.is_active !== false
  };
}

function normalizeUnitRecord_(input, rows) {
  const code = normalizeAdminCode_(input.code, 'Kode unit');
  assertUniqueAdminField_(rows, input.id, 'code', code, 'Kode unit sudah digunakan.');
  assertUniqueAdminField_(rows, input.id, 'name', requireAdminText_(input.name, 'Nama unit', 120), 'Nama unit sudah digunakan.');
  return {
    // Kolom dipertahankan untuk kompatibilitas sheet lama, tetapi tidak lagi menjadi relasi.
    division_id: '',
    code: code,
    name: requireAdminText_(input.name, 'Nama unit', 120),
    is_active: input.is_active !== false
  };
}

function normalizeCategoryRecord_(input, rows) {
  const code = normalizeAdminCode_(input.code, 'Kode kategori');
  assertUniqueAdminField_(rows, input.id, 'code', code, 'Kode kategori sudah digunakan.');
  assertUniqueAdminField_(rows, input.id, 'name', requireAdminText_(input.name, 'Nama kategori', 120), 'Nama kategori sudah digunakan.');
  return {
    code: code,
    name: requireAdminText_(input.name, 'Nama kategori', 120),
    description: optionalAdminText_(input.description, 500),
    is_active: input.is_active !== false
  };
}

function normalizeUserRecord_(input, rows, db) {
  const existing = rows.find(function (item) { return String(item.id) === String(input.id || ''); }) || {};
  const email = requireAdminText_(input.email, 'Email', 160).toLowerCase();
  assert_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'VALIDATION_ERROR', 'Format email tidak valid.');
  assertUniqueAdminField_(rows, input.id, 'email', email, 'Email sudah terdaftar.');
  const role = String(input.role || '').toUpperCase();
  assert_(Object.keys(ROLES).some(function (key) { return ROLES[key] === role; }), 'VALIDATION_ERROR', 'Role tidak valid.');
  const divisionId = String(input.division_id || '');
  const unitId = String(input.unit_id || '');
  if (divisionId) {
    assert_(readObjects_(SHEETS.DIVISIONS, db).some(function (item) { return String(item.id) === divisionId; }), 'VALIDATION_ERROR', 'Divisi pengguna tidak ditemukan.');
  }
  if (unitId) {
    assert_(readObjects_(SHEETS.UNITS, db).some(function (item) {
      return String(item.id) === unitId;
    }), 'VALIDATION_ERROR', 'Unit pengguna tidak ditemukan.');
  }
  return {
    google_sub: optionalAdminText_(input.google_sub === undefined ? existing.google_sub : input.google_sub, 200),
    email: email,
    full_name: requireAdminText_(input.full_name, 'Nama lengkap', 160),
    role: role,
    division_id: divisionId,
    unit_id: unitId,
    is_active: input.is_active !== false,
    last_login_at: input.last_login_at === undefined ? (existing.last_login_at || '') : input.last_login_at
  };
}

function normalizeLocationRecord_(input, rows, db) {
  const code = normalizeAdminCode_(input.code, 'Kode lokasi');
  assertUniqueAdminField_(rows, input.id, 'code', code, 'Kode lokasi sudah digunakan.');
  const type = String(input.type || '').toUpperCase();
  const allowedTypes = ['ROOM', 'RACK', 'SHELF', 'POSITION'];
  assert_(allowedTypes.indexOf(type) >= 0, 'VALIDATION_ERROR', 'Tipe lokasi tidak valid.');
  const requiredTypeForChild = { RACK: 'ROOM', SHELF: 'RACK', POSITION: 'SHELF' };
  const incompatibleChild = rows.some(function (item) {
    return String(item.parent_id || '') === String(input.id || '') && requiredTypeForChild[String(item.type)] !== type;
  });
  assert_(!incompatibleChild, 'VALIDATION_ERROR', 'Tipe lokasi tidak dapat diubah karena sudah memiliki lokasi turunan.');
  if (input.id && type !== 'POSITION') {
    const hasBox = readObjects_(SHEETS.STORAGE_BOXES, db).some(function (item) { return String(item.location_id) === String(input.id); });
    assert_(!hasBox, 'VALIDATION_ERROR', 'Tipe posisi tidak dapat diubah karena masih digunakan oleh boks.');
  }
  const parentId = String(input.parent_id || '');
  assert_(!input.id || parentId !== String(input.id), 'VALIDATION_ERROR', 'Lokasi tidak dapat menjadi induk dirinya sendiri.');
  const requiredParentType = { RACK: 'ROOM', SHELF: 'RACK', POSITION: 'SHELF' }[type];
  if (requiredParentType) {
    const parent = rows.find(function (item) { return String(item.id) === parentId; });
    assert_(parent && String(parent.type) === requiredParentType, 'VALIDATION_ERROR', 'Induk lokasi harus bertipe ' + requiredParentType + '.');
    let ancestor = parent;
    const visited = {};
    while (ancestor) {
      assert_(String(ancestor.id) !== String(input.id || ''), 'VALIDATION_ERROR', 'Hierarki lokasi membentuk siklus.');
      if (visited[ancestor.id]) break;
      visited[ancestor.id] = true;
      ancestor = rows.find(function (item) { return String(item.id) === String(ancestor.parent_id || ''); });
    }
  } else {
    assert_(!parentId, 'VALIDATION_ERROR', 'Lokasi ruang tidak menggunakan induk.');
  }
  const status = String(input.status || 'ACTIVE').toUpperCase();
  assert_(['ACTIVE', 'NEAR_FULL', 'FULL', 'INACTIVE'].indexOf(status) >= 0, 'VALIDATION_ERROR', 'Status lokasi tidak valid.');
  return {
    code: code,
    name: requireAdminText_(input.name, 'Nama lokasi', 160),
    type: type,
    parent_id: parentId,
    capacity: clampInteger_(input.capacity, 0, 0, 100000),
    status: status,
    notes: optionalAdminText_(input.notes, 500),
    barcode_value: 'LOC-' + code
  };
}

function normalizeBoxRecord_(input, rows, db) {
  const code = normalizeAdminCode_(input.code, 'Kode boks');
  assertUniqueAdminField_(rows, input.id, 'code', code, 'Kode boks sudah digunakan.');
  const locationId = validateUuidLike_(input.location_id, 'Posisi penyimpanan');
  const locations = readObjects_(SHEETS.STORAGE_LOCATIONS, db);
  const location = locations.find(function (item) { return String(item.id) === locationId; });
  assert_(location && String(location.type) === 'POSITION', 'VALIDATION_ERROR', 'Boks harus ditempatkan pada lokasi bertipe POSITION.');
  const existing = rows.find(function (item) { return String(item.id) === String(input.id || ''); }) || {};
  const capacity = clampInteger_(input.capacity, 1, 1, 100000);
  const occupancy = Number(existing.occupancy) || 0;
  assert_(capacity >= occupancy, 'VALIDATION_ERROR', 'Kapasitas tidak boleh lebih kecil dari jumlah arsip saat ini.');
  const status = String(input.status || 'ACTIVE').toUpperCase();
  assert_(['ACTIVE', 'FULL', 'INACTIVE'].indexOf(status) >= 0, 'VALIDATION_ERROR', 'Status boks tidak valid.');
  return {
    code: code,
    label: requireAdminText_(input.label || code, 'Label boks', 160),
    location_id: locationId,
    capacity: capacity,
    occupancy: occupancy,
    status: status,
    barcode_value: 'BOX-' + code
  };
}

function saveAdminSetting_(input, db, actor) {
  const key = String(input.key || '').toUpperCase();
  assert_(ADMIN_EDITABLE_SETTINGS.indexOf(key) >= 0, 'FORBIDDEN', 'Pengaturan ini tidak dapat diubah dari aplikasi.');
  const rowNumber = findRowNumberByField_(SHEETS.SETTINGS, 'key', key, db);
  assert_(rowNumber > 0, 'SETTING_NOT_FOUND', 'Pengaturan tidak ditemukan. Jalankan setupProject().');
  const before = readObjectAtRow_(SHEETS.SETTINGS, rowNumber, db);
  const value = normalizeAdminSettingValue_(key, input.value);
  const after = Object.assign({}, before, {
    value: value,
    updated_at: nowIso_(),
    updated_by_email: actor.email
  });
  writeObjectAtRow_(SHEETS.SETTINGS, rowNumber, after, db);
  incrementDataVersion_(db, actor.email);
  invalidateDataVersionCache_();
  appendAudit_({
    actor_user_id: actor.id,
    actor_email_snapshot: actor.email,
    action: 'SETTING_CHANGE',
    entity_type: 'Setting',
    entity_id: key,
    before: { value: before.value },
    after: { value: value }
  }, db);
  return { entity: 'setting', record: after };
}

function normalizeAdminSettingValue_(key, rawValue) {
  const value = requireAdminText_(rawValue, 'Nilai pengaturan', 300);
  const numericRanges = {
    MAX_FILE_SIZE_BYTES: [1048576, 5368709120],
    SEARCH_CACHE_SECONDS: [30, 3600],
    REMINDER_HOURS: [1, 720],
    ESCALATION_HOURS: [1, 720],
    PHYSICAL_CAPACITY_WARNING_PERCENT: [1, 100]
  };
  if (!numericRanges[key]) return value;
  assert_(/^\d+$/.test(value), 'VALIDATION_ERROR', 'Nilai pengaturan harus berupa bilangan bulat.');
  const number = Number(value);
  assert_(number >= numericRanges[key][0] && number <= numericRanges[key][1], 'VALIDATION_ERROR', 'Nilai pengaturan berada di luar rentang yang diizinkan.');
  return String(number);
}

function assertRowVersion_(input, existing) {
  if (input.row_version === undefined || input.row_version === null || input.row_version === '') return;
  assert_(Number(input.row_version) === (Number(existing.row_version) || 1), 'ROW_VERSION_CONFLICT', 'Data telah berubah. Muat ulang sebelum menyimpan kembali.');
}

function assertUniqueAdminField_(rows, id, field, value, message) {
  const normalized = String(value || '').toLowerCase();
  const duplicate = rows.some(function (item) {
    return String(item.id) !== String(id || '') && String(item[field] || '').toLowerCase() === normalized;
  });
  assert_(!duplicate, 'VALIDATION_ERROR', message);
}

function normalizeAdminCode_(value, label) {
  const code = requireAdminText_(value, label, 40).toUpperCase().replace(/\s+/g, '-');
  assert_(/^[A-Z0-9_-]+$/.test(code), 'VALIDATION_ERROR', label + ' hanya boleh berisi huruf, angka, garis bawah, dan tanda hubung.');
  return code;
}

function requireAdminText_(value, label, maximumLength) {
  const text = String(value || '').trim();
  assert_(text, 'VALIDATION_ERROR', label + ' wajib diisi.');
  assert_(text.length <= maximumLength, 'VALIDATION_ERROR', label + ' terlalu panjang.');
  assert_(text.charAt(0) !== '=', 'VALIDATION_ERROR', label + ' tidak boleh berupa formula spreadsheet.');
  return text;
}

function optionalAdminText_(value, maximumLength) {
  const text = String(value || '').trim();
  assert_(text.length <= maximumLength, 'VALIDATION_ERROR', 'Nilai terlalu panjang.');
  assert_(!text || text.charAt(0) !== '=', 'VALIDATION_ERROR', 'Nilai tidak boleh berupa formula spreadsheet.');
  return text;
}
