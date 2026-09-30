function doGet() {
  if (isApiOnly_()) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: true, service: APP.NAME, mode: 'api', version: APP.VERSION
    })).setMimeType(ContentService.MimeType.JSON);
  }
  getCurrentUser_();
  const template = HtmlService.createTemplateFromFile('index');
  template.appName = APP.NAME;
  template.appVersion = APP.VERSION;
  template.brandMarkDataUri = getBrandMarkDataUri_();

  return template.evaluate()
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function isApiOnly_() {
  return isTruthyCell_(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.API_ONLY));
}

function assertGasUiEnabled_() {
  assert_(!isApiOnly_(), 'GAS_UI_DISABLED', 'Gunakan aplikasi Arsiva-LM di Vercel.');
}

function doPost(event) {
  return ContentService
    .createTextOutput(JSON.stringify(handleInternalPost_(event)))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleInternalPost_(event) {
  return executeSafely_(function () {
    const body = parseInternalRequest_(event);
    assertInternalSignature_(body);
    const actor = getActorFromInternalMeta_(body.meta);
    return dispatchInternalAction_(body.action, body.payload || {}, actor);
  });
}

function parseInternalRequest_(event) {
  const raw = event && event.postData && event.postData.contents ? event.postData.contents : '';
  assert_(raw, 'REQUEST_EMPTY', 'Request internal kosong.');
  try {
    const parsed = JSON.parse(raw);
    assert_(parsed && typeof parsed === 'object', 'REQUEST_INVALID', 'Format request internal tidak valid.');
    return parsed;
  } catch (error) {
    throw appError_('REQUEST_INVALID', 'JSON request internal tidak valid.');
  }
}

function assertInternalSignature_(body) {
  const props = PropertiesService.getScriptProperties();
  const currentSecret = props.getProperty(PROPERTY_KEYS.APPS_SCRIPT_SHARED_SECRET);
  const previousSecret = props.getProperty(PROPERTY_KEYS.APPS_SCRIPT_PREVIOUS_SECRET);
  assert_(currentSecret, 'CONFIG_MISSING', 'APPS_SCRIPT_SHARED_SECRET belum dikonfigurasi.');

  const meta = body.meta || {};
  const timestampMs = Date.parse(String(meta.timestamp || ''));
  const nowMs = Date.now();
  assert_(Number.isFinite(timestampMs), 'SIGNATURE_INVALID', 'Timestamp request internal tidak valid.');
  assert_(Math.abs(nowMs - timestampMs) <= 5 * 60 * 1000, 'SIGNATURE_EXPIRED', 'Request internal sudah kedaluwarsa.');

  const nonce = String(meta.nonce || '');
  assert_(nonce && nonce.length >= 16, 'SIGNATURE_INVALID', 'Nonce request internal tidak valid.');
  const nonceCache = CacheService.getScriptCache();
  const nonceKey = 'internal-nonce:' + nonce;
  assert_(!nonceCache.get(nonceKey), 'SIGNATURE_REPLAY', 'Request internal sudah pernah diproses.');

  const canonical = canonicalInternalRequest_(body.action, meta, body.payload || {});
  const signature = String(body.signature || '');
  const matchesCurrent = timingSafeEqual_(signature, computeHmacSha256Base64Url_(canonical, currentSecret));
  const matchesPrevious = previousSecret && timingSafeEqual_(signature, computeHmacSha256Base64Url_(canonical, previousSecret));
  assert_(matchesCurrent || matchesPrevious, 'SIGNATURE_INVALID', 'Signature request internal tidak valid.');
  const lock = LockService.getScriptLock();
  lock.waitLock(APP.LOCK_TIMEOUT_MS);
  try {
    assert_(!nonceCache.get(nonceKey), 'SIGNATURE_REPLAY', 'Request internal sudah pernah diproses.');
    nonceCache.put(nonceKey, '1', 600);
  } finally {
    lock.releaseLock();
  }
}

function canonicalInternalRequest_(action, meta, payload) {
  return JSON.stringify({
    action: String(action || ''),
    meta: meta || {},
    payload: payload || {}
  });
}

function dispatchInternalAction_(action, payload, actor) {
  switch (String(action || '')) {
    case 'system.health': {
      assert_(actor.role === ROLES.SUPER_ADMIN, 'FORBIDDEN', 'Hanya Super Admin dapat memeriksa koneksi.');
      const db = getDatabase_();
      Object.keys(SHEET_SCHEMAS).forEach(function (name) { getSheet_(name, db); });
      return { database_ready: true, api_only: isApiOnly_(), version: APP.VERSION, checked_at: nowIso_() };
    }
    case 'dashboard.bootstrap':
      return buildDashboardBootstrap_(actor);
    case 'archives.list':
      return listArchivesPage_(payload || {}, null, actor);
    case 'verification_tasks.list': {
      const db = getDatabase_();
      return getDashboardTasks_(actor, db, readObjects_(SHEETS.ARCHIVES, db));
    }
    case 'master.bootstrap':
      return getInternalMasterBootstrap_();
    default:
      throw appError_('ACTION_NOT_FOUND', 'Action internal tidak tersedia.');
  }
}

function getInternalMasterBootstrap_() {
  const db = getDatabase_();
  return {
    divisions: readObjects_(SHEETS.DIVISIONS, db),
    units: readObjects_(SHEETS.UNITS, db),
    categories: readObjects_(SHEETS.CATEGORIES, db),
    locations: readObjects_(SHEETS.STORAGE_LOCATIONS, db),
    boxes: readObjects_(SHEETS.STORAGE_BOXES, db)
  };
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDashboardBootstrap() {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    return buildDashboardBootstrap_();
  });
}

function getArchivesPage(options) {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    return listArchivesPage_(options || {});
  });
}

function searchArchives(options) {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    const normalized = Object.assign({}, options || {});
    normalized.page = normalized.page || 1;
    return listArchivesPage_(normalized);
  });
}

function getArchiveDetail(archiveId) {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    return getArchiveDetail_(archiveId);
  });
}

function getArchivePreview(archiveId) {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    return getArchivePreview_(archiveId);
  });
}

function getNotifications(options) {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    return listNotifications_(options || {});
  });
}

function markNotificationRead(notificationId) {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    return markNotificationRead_(notificationId);
  });
}

function getAdminBootstrap() {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    return getAdminBootstrap_();
  });
}

function saveAdminRecord(entity, payload) {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    return saveAdminRecord_(entity, payload || {});
  });
}

function getAuditLogs(options) {
  return executeSafely_(function () {
    assertGasUiEnabled_();
    return listAuditLogs_(options || {});
  });
}
