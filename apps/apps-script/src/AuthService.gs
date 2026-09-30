function getCurrentUser_(spreadsheet) {
  const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const email = activeEmail;

  assert_(email, 'AUTH_EMAIL_UNAVAILABLE', 'Email Google Workspace tidak tersedia. Periksa mode deployment Web App.');
  assertAllowedDomain_(email);

  const cache = CacheService.getUserCache();
  const cacheKey = 'current-user:' + email;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const users = readObjects_(SHEETS.USERS, spreadsheet);
  const user = users.find(function (item) {
    return String(item.email || '').trim().toLowerCase() === email;
  });

  assert_(user, 'USER_NOT_REGISTERED', 'Akun belum terdaftar pada Arsiva-LM.');
  assert_(isTruthyCell_(user.is_active), 'ACCOUNT_INACTIVE', 'Akun Arsiva-LM sedang dinonaktifkan.');

  const projected = {
    id: user.id,
    email: email,
    full_name: user.full_name,
    role: user.role,
    division_id: user.division_id || '',
    unit_id: user.unit_id || ''
  };

  cache.put(cacheKey, JSON.stringify(projected), 60);
  return projected;
}

function getActorFromInternalMeta_(meta) {
  const actor = meta && meta.actor ? meta.actor : {};
  const role = String(actor.role || ROLES.USER).toUpperCase();
  const allowed = Object.keys(ROLES).some(function (key) { return ROLES[key] === role; });
  assert_(actor.uid, 'ACTOR_INVALID', 'Identitas internal tidak lengkap.');
  assert_(allowed, 'ACTOR_INVALID', 'Role internal tidak valid.');
  return {
    id: String(actor.uid),
    email: String(actor.email || actor.username || '').toLowerCase(),
    full_name: actor.name || actor.username || 'Pengguna',
    role: role,
    division_id: String(actor.division_id || ''),
    unit_id: String(actor.unit_id || '')
  };
}

function assertAllowedDomain_(email) {
  const configured = PropertiesService
    .getScriptProperties()
    .getProperty(PROPERTY_KEYS.ALLOWED_GOOGLE_DOMAINS);

  assert_(configured, 'CONFIG_MISSING', 'ALLOWED_GOOGLE_DOMAINS belum dikonfigurasi.');

  const domains = configured
    .split(',')
    .map(function (item) { return item.trim().toLowerCase(); })
    .filter(Boolean);
  const emailDomain = email.split('@')[1] || '';

  assert_(domains.indexOf(emailDomain) >= 0, 'DOMAIN_NOT_ALLOWED', 'Gunakan akun Google Workspace kantor.');
}

function canViewAllArchives_(user) {
  return user.role === ROLES.SUPER_ADMIN || user.role === ROLES.VERIFIER || user.role === ROLES.APPROVER_L2;
}

function canViewArchive_(user, archive, grantedArchiveIds) {
  if (canViewAllArchives_(user)) return true;
  const sameDivision = user.division_id && archive.division_id && String(archive.division_id) === String(user.division_id);
  const sameUnit = user.unit_id && archive.unit_id && String(archive.unit_id) === String(user.unit_id);
  if (sameDivision || sameUnit) return true;
  return grantedArchiveIds && grantedArchiveIds.has(String(archive.id));
}

function hasRole_(user, allowedRoles) {
  return allowedRoles.indexOf(user.role) >= 0;
}
