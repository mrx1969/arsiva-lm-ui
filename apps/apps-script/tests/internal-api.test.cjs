const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness() {
  const props = new Map([['APPS_SCRIPT_SHARED_SECRET', 'test-only-secret'], ['API_ONLY', 'true'], ['ADMIN_EMAIL', 'owner@example.test']]);
  const cache = new Map();
  let databaseReads = 0;
  const context = vm.createContext({
    console: { error() {}, warn() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => props.get(key), setProperty: (key, value) => props.set(key, value) }) },
    CacheService: { getScriptCache: () => ({ get: key => cache.get(key), put: (key, value) => cache.set(key, value) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => '' }), getEffectiveUser: () => ({ getEmail: () => 'owner@example.test' }) },
    Utilities: {
      Charset: { UTF_8: 'utf8' },
      computeHmacSha256Signature: (text, secret) => [...crypto.createHmac('sha256', secret).update(text).digest()],
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url')
    },
    getDatabase_: () => { databaseReads++; return {}; },
    getSheet_: () => ({})
  });
  for (const file of ['Config.gs', 'Utils.gs', 'AuthService.gs', 'Code.gs', 'Setup.gs']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'), context, { filename: file });
  }
  const makeRequest = (role = 'SUPER_ADMIN', timestamp = new Date().toISOString()) => {
    const body = { action: 'system.health', meta: { timestamp, nonce: crypto.randomUUID(), actor: { uid: 'test-user', role } }, payload: {} };
    body.signature = crypto.createHmac('sha256', 'test-only-secret').update(JSON.stringify(body)).digest('base64url');
    return { postData: { contents: JSON.stringify(body) } };
  };
  return { context, makeRequest, reads: () => databaseReads };
}

test('signed administrator health checks database; replay is rejected before reading', () => {
  const h = harness();
  const request = h.makeRequest();
  assert.equal(h.context.handleInternalPost_(request).data.database_ready, true);
  assert.equal(h.context.handleInternalPost_(request).error.code, 'SIGNATURE_REPLAY');
  assert.equal(h.reads(), 1);
});

test('tampered signature and expired timestamp cannot read database', () => {
  const h = harness();
  const request = h.makeRequest();
  const body = JSON.parse(request.postData.contents);
  body.meta.actor.uid = 'changed';
  request.postData.contents = JSON.stringify(body);
  assert.equal(h.context.handleInternalPost_(request).error.code, 'SIGNATURE_INVALID');
  assert.equal(h.context.handleInternalPost_(h.makeRequest('SUPER_ADMIN', '2000-01-01T00:00:00Z')).error.code, 'SIGNATURE_EXPIRED');
  assert.equal(h.reads(), 0);
});

test('health is restricted to super admin even with a valid signature', () => {
  const h = harness();
  assert.equal(h.context.handleInternalPost_(h.makeRequest('USER')).error.code, 'FORBIDDEN');
  assert.equal(h.reads(), 0);
});

test('API mode blocks HTMLService RPC entry points', () => {
  const h = harness();
  for (const name of ['getDashboardBootstrap', 'getArchivesPage', 'searchArchives', 'getArchiveDetail', 'getArchivePreview', 'getNotifications', 'markNotificationRead', 'getAdminBootstrap', 'saveAdminRecord', 'getAuditLogs']) {
    assert.equal(h.context[name]().error.code, 'GAS_UI_DISABLED', name);
  }
  assert.equal(h.reads(), 0);
});

test('anonymous caller cannot run setup or configure bridge under owner identity', () => {
  const h = harness();
  assert.equal(h.context.setupProject().error.code, 'FORBIDDEN');
  assert.equal(h.context.prepareVercelBridge().error.code, 'FORBIDDEN');
  assert.equal(h.reads(), 0);
});
