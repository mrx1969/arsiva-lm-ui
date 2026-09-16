function setupProject() {
  return executeSafely_(function () {
    const lock = LockService.getScriptLock();
    lock.waitLock(APP.LOCK_TIMEOUT_MS);

    try {
      const properties = PropertiesService.getScriptProperties();
      const spreadsheet = getOrCreateDatabaseForSetup_(properties);
      setExecutionDatabase_(spreadsheet);

      ensureSchemaSheets_(spreadsheet);
      ensureDefaultSettings_(spreadsheet);
      const admin = ensureInitialAdmin_(spreadsheet, properties);

      SpreadsheetApp.flush();

      return {
        spreadsheet_id: spreadsheet.getId(),
        spreadsheet_url: spreadsheet.getUrl(),
        admin_email: admin.email,
        sheets_created_or_verified: Object.keys(SHEET_SCHEMAS).length,
        next_step: 'Deploy sebagai Web App dan batasi ke domain Google Workspace.'
      };
    } finally {
      lock.releaseLock();
    }
  });
}

function getOrCreateDatabaseForSetup_(properties) {
  const existingId = properties.getProperty(PROPERTY_KEYS.SPREADSHEET_ID);
  if (existingId) return SpreadsheetApp.openById(existingId);

  const spreadsheet = SpreadsheetApp.create(APP.NAME + ' Data');
  properties.setProperty(PROPERTY_KEYS.SPREADSHEET_ID, spreadsheet.getId());
  return spreadsheet;
}

function ensureSchemaSheets_(spreadsheet) {
  const schemaNames = Object.keys(SHEET_SCHEMAS);
  const defaultSheet = spreadsheet.getSheetByName('Sheet1');

  if (defaultSheet && defaultSheet.getLastRow() === 0 && !spreadsheet.getSheetByName(schemaNames[0])) {
    defaultSheet.setName(schemaNames[0]);
  }

  schemaNames.forEach(function (sheetName) {
    const schema = getSchema_(sheetName);
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      sheet.getRange(1, 1, 1, schema.length).setValues([schema]);
      formatHeader_(sheet, schema.length);
      return;
    }

    const currentHeader = sheet.getRange(1, 1, 1, schema.length).getValues()[0];
    const matches = schema.every(function (column, index) {
      return String(currentHeader[index]) === column;
    });

    assert_(matches, 'SCHEMA_MISMATCH', 'Header tab ' + sheetName + ' berbeda dari schema. Tidak ada data yang diubah.');
    formatHeader_(sheet, schema.length);
  });
}

function formatHeader_(sheet, columnCount) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, columnCount)
    .setBackground('#1F3A5F')
    .setFontColor('#FFFFFF')
    .setFontFamily('Aptos')
    .setFontWeight('bold')
    .setWrap(true);
}

function ensureDefaultSettings_(spreadsheet) {
  const existing = readObjects_(SHEETS.SETTINGS, spreadsheet);
  const existingKeys = new Set(existing.map(function (item) {
    return String(item.key);
  }));
  const actorEmail = Session.getEffectiveUser().getEmail();
  const timestamp = nowIso_();

  const missing = SETTINGS_DEFAULTS
    .filter(function (item) { return !existingKeys.has(item[0]); })
    .map(function (item) {
      return {
        key: item[0],
        value: item[1],
        description: item[2],
        updated_at: timestamp,
        updated_by_email: actorEmail
      };
    });

  appendObjects_(SHEETS.SETTINGS, missing, spreadsheet);
}

function ensureInitialAdmin_(spreadsheet, properties) {
  const users = readObjects_(SHEETS.USERS, spreadsheet);
  if (users.length > 0) return users[0];

  const configuredEmail = properties.getProperty(PROPERTY_KEYS.ADMIN_EMAIL);
  const fallbackEmail = Session.getEffectiveUser().getEmail();
  const email = String(configuredEmail || fallbackEmail || '').trim().toLowerCase();
  assert_(email, 'ADMIN_EMAIL_MISSING', 'Atur Script Property ADMIN_EMAIL sebelum setup.');

  const timestamp = nowIso_();
  const admin = {
    id: uuid_(),
    google_sub: '',
    email: email,
    full_name: email.split('@')[0],
    role: ROLES.SUPER_ADMIN,
    division_id: '',
    unit_id: '',
    is_active: true,
    last_login_at: '',
    created_at: timestamp,
    updated_at: timestamp,
    row_version: 1
  };

  appendObjects_(SHEETS.USERS, [admin], spreadsheet);
  return admin;
}
