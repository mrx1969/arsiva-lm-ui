let executionDatabase_ = null;

function getDatabase_() {
  if (executionDatabase_) return executionDatabase_;

  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(PROPERTY_KEYS.SPREADSHEET_ID);

  assert_(spreadsheetId, 'CONFIG_MISSING', 'SPREADSHEET_ID belum dikonfigurasi. Jalankan setupProject().');
  executionDatabase_ = SpreadsheetApp.openById(spreadsheetId);
  return executionDatabase_;
}

function setExecutionDatabase_(spreadsheet) {
  executionDatabase_ = spreadsheet;
}

function getSheet_(sheetName, spreadsheet) {
  const db = spreadsheet || getDatabase_();
  const sheet = db.getSheetByName(sheetName);
  assert_(sheet, 'SHEET_NOT_FOUND', 'Tab ' + sheetName + ' belum tersedia. Jalankan setupProject().');
  return sheet;
}

function getSchema_(sheetName) {
  const schema = SHEET_SCHEMAS[sheetName];
  assert_(schema, 'SCHEMA_NOT_FOUND', 'Schema tab ' + sheetName + ' tidak ditemukan.');
  return schema;
}

function readObjects_(sheetName, spreadsheet) {
  const schema = getSchema_(sheetName);
  const sheet = getSheet_(sheetName, spreadsheet);
  const rowCount = Math.max(sheet.getLastRow() - 1, 0);

  if (rowCount === 0) return [];

  const rows = sheet.getRange(2, 1, rowCount, schema.length).getValues();
  return rows.map(function (row) {
    return rowToObject_(schema, row);
  });
}

function readObjectAtRow_(sheetName, rowNumber, spreadsheet) {
  const schema = getSchema_(sheetName);
  const sheet = getSheet_(sheetName, spreadsheet);
  assert_(rowNumber >= 2 && rowNumber <= sheet.getLastRow(), 'ROW_NOT_FOUND', 'Data tidak ditemukan.');

  const row = sheet.getRange(rowNumber, 1, 1, schema.length).getValues()[0];
  return rowToObject_(schema, row);
}

function rowToObject_(schema, row) {
  const output = {};
  schema.forEach(function (column, index) {
    output[column] = row[index];
  });
  return output;
}

function objectToRow_(schema, object) {
  return schema.map(function (column) {
    const value = object[column];
    return value === undefined || value === null ? '' : value;
  });
}

function appendObjects_(sheetName, objects, spreadsheet) {
  if (!objects || objects.length === 0) return;

  const schema = getSchema_(sheetName);
  const sheet = getSheet_(sheetName, spreadsheet);
  const rows = objects.map(function (object) {
    return objectToRow_(schema, object);
  });

  sheet
    .getRange(sheet.getLastRow() + 1, 1, rows.length, schema.length)
    .setValues(rows);
}

function writeObjectAtRow_(sheetName, rowNumber, object, spreadsheet) {
  const schema = getSchema_(sheetName);
  const sheet = getSheet_(sheetName, spreadsheet);
  const row = objectToRow_(schema, object);
  sheet.getRange(rowNumber, 1, 1, schema.length).setValues([row]);
}

function findRowNumberByField_(sheetName, fieldName, expectedValue, spreadsheet) {
  const schema = getSchema_(sheetName);
  const columnIndex = schema.indexOf(fieldName);
  assert_(columnIndex >= 0, 'COLUMN_NOT_FOUND', 'Kolom ' + fieldName + ' tidak tersedia.');

  const sheet = getSheet_(sheetName, spreadsheet);
  const rowCount = Math.max(sheet.getLastRow() - 1, 0);
  if (rowCount === 0) return -1;

  const values = sheet.getRange(2, columnIndex + 1, rowCount, 1).getValues();
  const normalizedExpected = String(expectedValue || '').toLowerCase();

  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0] || '').toLowerCase() === normalizedExpected) {
      return index + 2;
    }
  }

  return -1;
}

function getSetting_(key, spreadsheet) {
  const settings = readObjects_(SHEETS.SETTINGS, spreadsheet);
  const match = settings.find(function (item) {
    return String(item.key) === String(key);
  });
  return match ? match.value : '';
}

function incrementDataVersion_(spreadsheet, actorEmail) {
  const sheetName = SHEETS.SETTINGS;
  const rowNumber = findRowNumberByField_(sheetName, 'key', 'DATA_VERSION', spreadsheet);
  assert_(rowNumber > 0, 'DATA_VERSION_MISSING', 'Setting DATA_VERSION tidak ditemukan.');

  const record = readObjectAtRow_(sheetName, rowNumber, spreadsheet);
  record.value = String((Number(record.value) || 0) + 1);
  record.updated_at = nowIso_();
  record.updated_by_email = actorEmail || '';
  writeObjectAtRow_(sheetName, rowNumber, record, spreadsheet);
  return record.value;
}

