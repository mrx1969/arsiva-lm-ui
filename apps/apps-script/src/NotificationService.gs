function markNotificationRead_(notificationId) {
  const id = validateUuidLike_(notificationId, 'Notification ID');
  const lock = LockService.getScriptLock();
  lock.waitLock(APP.LOCK_TIMEOUT_MS);

  try {
    const db = getDatabase_();
    const user = getCurrentUser_(db);
    const rowNumber = findRowNumberByField_(SHEETS.NOTIFICATIONS, 'id', id, db);
    assert_(rowNumber > 0, 'NOTIFICATION_NOT_FOUND', 'Notifikasi tidak ditemukan.');

    const record = readObjectAtRow_(SHEETS.NOTIFICATIONS, rowNumber, db);
    assert_(String(record.user_id) === String(user.id), 'NOTIFICATION_NOT_FOUND', 'Notifikasi tidak ditemukan.');

    if (record.read_at) {
      return { id: record.id, read_at: record.read_at, already_read: true };
    }

    const before = { read_at: record.read_at || '' };
    record.read_at = nowIso_();
    record.updated_at = record.read_at;
    record.row_version = (Number(record.row_version) || 0) + 1;
    writeObjectAtRow_(SHEETS.NOTIFICATIONS, rowNumber, record, db);

    incrementDataVersion_(db, user.email);
    invalidateDataVersionCache_();
    appendAudit_({
      actor_user_id: user.id,
      actor_email_snapshot: user.email,
      action: 'NOTIFICATION_READ',
      entity_type: 'Notification',
      entity_id: record.id,
      before: before,
      after: { read_at: record.read_at }
    }, db);

    return { id: record.id, read_at: record.read_at, already_read: false };
  } finally {
    lock.releaseLock();
  }
}

