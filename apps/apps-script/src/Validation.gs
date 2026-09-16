function normalizeArchiveListOptions_(input) {
  const options = input || {};
  const allowedSizes = [20, 50, 100];
  const requestedSize = clampInteger_(options.page_size, APP.DEFAULT_PAGE_SIZE, 1, APP.MAX_PAGE_SIZE);

  return {
    page: clampInteger_(options.page, 1, 1, 100000),
    page_size: allowedSizes.indexOf(requestedSize) >= 0 ? requestedSize : APP.DEFAULT_PAGE_SIZE,
    query: normalizeText_(options.query),
    division_id: String(options.division_id || ''),
    unit_id: String(options.unit_id || ''),
    category_id: String(options.category_id || ''),
    status: String(options.status || '').toUpperCase()
  };
}

function validateUuidLike_(value, fieldLabel) {
  const normalized = String(value || '').trim();
  assert_(normalized.length >= 8 && normalized.length <= 128, 'VALIDATION_ERROR', fieldLabel + ' tidak valid.');
  return normalized;
}

