function appendAudit_(entry, spreadsheet) {
  const db = spreadsheet || getDatabase_();
  const sheet = getSheet_(SHEETS.AUDIT_LOGS, db);
  const lastRow = sheet.getLastRow();
  const schema = getSchema_(SHEETS.AUDIT_LOGS);
  const previousHashColumn = schema.indexOf('row_hash') + 1;
  const previousHash = lastRow >= 2
    ? String(sheet.getRange(lastRow, previousHashColumn, 1, 1).getValues()[0][0] || '')
    : '';

  const record = {
    id: uuid_(),
    occurred_at: nowIso_(),
    request_id: entry.request_id || uuid_(),
    actor_user_id: entry.actor_user_id || '',
    actor_email_snapshot: entry.actor_email_snapshot || '',
    action: entry.action,
    entity_type: entry.entity_type || '',
    entity_id: entry.entity_id || '',
    before_json: JSON.stringify(entry.before || null),
    after_json: JSON.stringify(entry.after || null),
    metadata_json: JSON.stringify(entry.metadata || {}),
    previous_hash: previousHash,
    row_hash: ''
  };

  const hashPayload = JSON.stringify(record) + previousHash;
  record.row_hash = computeSha256_(hashPayload);
  appendObjects_(SHEETS.AUDIT_LOGS, [record], db);
  return record.id;
}

