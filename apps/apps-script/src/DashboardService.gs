function buildDashboardBootstrap_(actorOverride) {
  const db = getDatabase_();
  const user = actorOverride || getCurrentUser_(db);
  const version = getDataVersion_(db);
  const cache = CacheService.getUserCache();
  const scopeHash = computeSha256_(JSON.stringify([user.id, user.role, user.division_id || '', user.unit_id || '']));
  const cacheKey = 'dashboard:' + scopeHash + ':app' + APP.VERSION + ':v' + version;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const master = getMasterDataCached_(db);
  const archives = readObjects_(SHEETS.ARCHIVES, db);
  const grants = canViewAllArchives_(user) ? new Set() : getActiveGrantArchiveIds_(user, db);
  const archivePage = listArchivesPage_(
    { page: 1, page_size: 20 },
    db,
    user,
    { master: master, archives: archives, grants: grants }
  );
  const visibleArchives = archivePage.rows;
  const allScopedArchives = getScopedArchiveSummary_(user, archives, grants);
  const tasks = getDashboardTasks_(user, db, archives);
  const unreadNotifications = countUnreadNotifications_(user, db);

  const result = {
    app: { name: APP.NAME, version: APP.VERSION },
    user: user,
    permissions: buildPermissions_(user),
    master: master,
    stats: buildArchiveStats_(allScopedArchives),
    verification_tasks: tasks.slice(0, 5),
    latest_archives: visibleArchives.slice(0, 10),
    unread_notifications: unreadNotifications,
    generated_at: nowIso_()
  };

  try {
    cache.put(cacheKey, JSON.stringify(result), APP.DASHBOARD_CACHE_SECONDS);
  } catch (error) {
    console.warn('Dashboard cache dilewati: ' + error.message);
  }

  return result;
}

function getScopedArchiveSummary_(user, archives, grants) {
  return archives.filter(function (archive) {
    return !archive.deleted_at && canViewArchive_(user, archive, grants);
  });
}

function buildArchiveStats_(archives) {
  const stats = { total: 0, draft: 0, pending_verification: 0, final: 0 };
  archives.forEach(function (archive) {
    stats.total += 1;
    const statusKey = String(archive.status || '').toLowerCase();
    if (statusKey === 'pending_verification' || statusKey === 'pending_l1' || statusKey === 'pending_l2') {
      stats.pending_verification += 1;
    } else if (Object.prototype.hasOwnProperty.call(stats, statusKey)) {
      stats[statusKey] += 1;
    }
  });
  return stats;
}

function getDashboardTasks_(user, spreadsheet, archives) {
  if (!hasRole_(user, [ROLES.SUPER_ADMIN, ROLES.VERIFIER, ROLES.APPROVER_L1, ROLES.APPROVER_L2])) return [];

  const archiveLookup = new Map((archives || []).map(function (archive) {
    return [String(archive.id), archive];
  }));

  return readObjects_(SHEETS.APPROVAL_TASKS, spreadsheet)
    .filter(function (task) {
      if (String(task.status) !== 'PENDING') return false;
      return user.role === ROLES.SUPER_ADMIN || String(task.assigned_to_user_id) === String(user.id);
    })
    .sort(function (left, right) {
      return String(left.due_at || '').localeCompare(String(right.due_at || ''));
    })
    .map(function (task) {
      const archive = archiveLookup.get(String(task.archive_id)) || {};
      return {
        id: task.id,
        archive_id: task.archive_id,
        archive_number: archive.archive_number || '',
        archive_title: archive.title || '',
        level: Number(task.level),
        due_at: task.due_at,
        status: task.status
      };
    });
}

function countUnreadNotifications_(user, spreadsheet) {
  return readObjects_(SHEETS.NOTIFICATIONS, spreadsheet).filter(function (item) {
    return String(item.user_id) === String(user.id) && !item.read_at;
  }).length;
}

function buildPermissions_(user) {
  return {
    can_upload: hasRole_(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN_DIVISION, ROLES.USER]),
    can_verify: hasRole_(user, [ROLES.SUPER_ADMIN, ROLES.VERIFIER, ROLES.APPROVER_L1, ROLES.APPROVER_L2]),
    can_manage_master: user.role === ROLES.SUPER_ADMIN,
    can_view_audit: user.role === ROLES.SUPER_ADMIN
  };
}
