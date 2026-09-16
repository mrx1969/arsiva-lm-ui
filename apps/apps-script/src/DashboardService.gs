function buildDashboardBootstrap_() {
  const db = getDatabase_();
  const user = getCurrentUser_(db);
  const version = getDataVersion_(db);
  const cache = CacheService.getUserCache();
  const cacheKey = 'dashboard:' + user.id + ':v' + version;
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
  const tasks = getDashboardTasks_(user, db);
  const unreadNotifications = countUnreadNotifications_(user, db);

  const result = {
    app: { name: APP.NAME, version: APP.VERSION },
    user: user,
    permissions: buildPermissions_(user),
    master: master,
    stats: buildArchiveStats_(allScopedArchives),
    approval_tasks: tasks.slice(0, 5),
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
  const stats = { total: 0, draft: 0, pending_l1: 0, pending_l2: 0, final: 0 };
  archives.forEach(function (archive) {
    stats.total += 1;
    const statusKey = String(archive.status || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(stats, statusKey)) stats[statusKey] += 1;
  });
  return stats;
}

function getDashboardTasks_(user, spreadsheet) {
  if (!hasRole_(user, [ROLES.SUPER_ADMIN, ROLES.APPROVER_L1, ROLES.APPROVER_L2])) return [];

  return readObjects_(SHEETS.APPROVAL_TASKS, spreadsheet)
    .filter(function (task) {
      if (String(task.status) !== 'PENDING') return false;
      return user.role === ROLES.SUPER_ADMIN || String(task.assigned_to_user_id) === String(user.id);
    })
    .sort(function (left, right) {
      return String(left.due_at || '').localeCompare(String(right.due_at || ''));
    })
    .map(function (task) {
      return {
        id: task.id,
        archive_id: task.archive_id,
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
    can_approve_l1: hasRole_(user, [ROLES.SUPER_ADMIN, ROLES.APPROVER_L1]),
    can_approve_l2: hasRole_(user, [ROLES.SUPER_ADMIN, ROLES.APPROVER_L2]),
    can_manage_master: user.role === ROLES.SUPER_ADMIN,
    can_view_audit: user.role === ROLES.SUPER_ADMIN
  };
}
