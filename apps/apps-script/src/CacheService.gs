function getDataVersion_(spreadsheet) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'settings:data-version';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const value = String(getSetting_('DATA_VERSION', spreadsheet) || '1');
  cache.put(cacheKey, value, 60);
  return value;
}

function getMasterDataCached_(spreadsheet) {
  const version = getDataVersion_(spreadsheet);
  const cache = CacheService.getScriptCache();
  const cacheKey = 'master-data:v' + version;
  const cached = cache.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const result = {
    divisions: readObjects_(SHEETS.DIVISIONS, spreadsheet)
      .filter(function (item) { return isTruthyCell_(item.is_active); })
      .map(projectDivision_),
    units: readObjects_(SHEETS.UNITS, spreadsheet)
      .filter(function (item) { return isTruthyCell_(item.is_active); })
      .map(projectUnit_),
    categories: readObjects_(SHEETS.CATEGORIES, spreadsheet)
      .filter(function (item) { return isTruthyCell_(item.is_active); })
      .map(projectCategory_)
  };

  try {
    cache.put(cacheKey, JSON.stringify(result), APP.MASTER_CACHE_SECONDS);
  } catch (error) {
    console.warn('Master cache dilewati: ' + error.message);
  }

  return result;
}

function projectDivision_(item) {
  return { id: item.id, code: item.code, name: item.name };
}

function projectUnit_(item) {
  return { id: item.id, division_id: item.division_id, code: item.code, name: item.name };
}

function projectCategory_(item) {
  return { id: item.id, code: item.code, name: item.name };
}

function invalidateDataVersionCache_() {
  CacheService.getScriptCache().remove('settings:data-version');
}

