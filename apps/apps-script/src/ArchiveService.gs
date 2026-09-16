function listArchivesPage_(input, spreadsheet, currentUser, preload) {
  const db = spreadsheet || getDatabase_();
  const user = currentUser || getCurrentUser_(db);
  const loaded = preload || {};
  const options = normalizeArchiveListOptions_(input);
  const archives = loaded.archives || readObjects_(SHEETS.ARCHIVES, db);
  const grants = loaded.grants || (canViewAllArchives_(user) ? new Set() : getActiveGrantArchiveIds_(user, db));
  const master = loaded.master || getMasterDataCached_(db);
  const lookups = buildArchiveLookups_(master);

  const filtered = archives
    .filter(function (archive) {
      if (archive.deleted_at) return false;
      if (!canViewArchive_(user, archive, grants)) return false;
      if (options.division_id && String(archive.division_id) !== options.division_id) return false;
      if (options.unit_id && String(archive.unit_id) !== options.unit_id) return false;
      if (options.category_id && String(archive.category_id) !== options.category_id) return false;
      if (options.status && String(archive.status) !== options.status) return false;

      if (options.query) {
        const haystack = normalizeText_([
          archive.archive_number,
          archive.title,
          archive.tags_json
        ].join(' '));
        if (haystack.indexOf(options.query) < 0) return false;
      }

      return true;
    })
    .sort(function (left, right) {
      return String(right.created_at || '').localeCompare(String(left.created_at || ''));
    });

  const total = filtered.length;
  const start = (options.page - 1) * options.page_size;
  const pageRows = filtered
    .slice(start, start + options.page_size)
    .map(function (archive) { return projectArchiveListItem_(archive, lookups); });

  return {
    rows: pageRows,
    pagination: {
      current_page: options.page,
      page_size: options.page_size,
      total: total,
      last_page: Math.max(Math.ceil(total / options.page_size), 1)
    },
    query: options.query
  };
}

function getActiveGrantArchiveIds_(user, spreadsheet) {
  const now = Date.now();
  const grants = readObjects_(SHEETS.ACCESS_GRANTS, spreadsheet);
  return new Set(grants
    .filter(function (grant) {
      if (String(grant.grantee_user_id) !== String(user.id)) return false;
      if (grant.revoked_at) return false;
      if (grant.expires_at && new Date(grant.expires_at).getTime() <= now) return false;
      return true;
    })
    .map(function (grant) { return String(grant.archive_id); }));
}

function buildArchiveLookups_(master) {
  return {
    divisions: new Map(master.divisions.map(function (item) { return [String(item.id), item]; })),
    units: new Map(master.units.map(function (item) { return [String(item.id), item]; })),
    categories: new Map(master.categories.map(function (item) { return [String(item.id), item]; }))
  };
}

function projectArchiveListItem_(archive, lookups) {
  const division = lookups.divisions.get(String(archive.division_id));
  const unit = lookups.units.get(String(archive.unit_id));
  const category = lookups.categories.get(String(archive.category_id));

  return {
    id: archive.id,
    archive_number: archive.archive_number,
    title: archive.title,
    status: archive.status,
    division: division || { id: archive.division_id, code: '', name: '' },
    unit: unit || null,
    category: category || null,
    tags: parseJsonArray_(archive.tags_json),
    archive_date: archive.archive_date,
    needs_revision: isTruthyCell_(archive.needs_revision),
    created_at: archive.created_at,
    row_version: Number(archive.row_version) || 1
  };
}
