function success_(data, meta) {
  return {
    ok: true,
    data: serializeForClient_(data),
    error: null,
    meta: serializeForClient_(meta || {})
  };
}

function failure_(code, message, details) {
  return {
    ok: false,
    data: null,
    error: {
      code: code || 'INTERNAL_ERROR',
      message: message || 'Terjadi kesalahan pada server.',
      details: serializeForClient_(details || [])
    },
    meta: {}
  };
}

function executeSafely_(callback) {
  try {
    return success_(callback());
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return failure_(
      error && error.code ? error.code : 'INTERNAL_ERROR',
      error && error.safeMessage ? error.safeMessage : 'Permintaan tidak dapat diproses.',
      []
    );
  }
}

function appError_(code, safeMessage) {
  const error = new Error(safeMessage);
  error.code = code;
  error.safeMessage = safeMessage;
  return error;
}

function assert_(condition, code, safeMessage) {
  if (!condition) {
    throw appError_(code, safeMessage);
  }
}

function nowIso_() {
  return new Date().toISOString();
}

function uuid_() {
  return Utilities.getUuid();
}

function normalizeText_(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseJsonArray_(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function parseJsonObject_(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (!value) return {};

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function serializeForClient_(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeForClient_);

  if (value && typeof value === 'object') {
    const output = {};
    Object.keys(value).forEach(function (key) {
      output[key] = serializeForClient_(value[key]);
    });
    return output;
  }

  return value;
}

function clampInteger_(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
}

function isTruthyCell_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE' || String(value) === '1';
}

function computeSha256_(text) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return normalized.toString(16).padStart(2, '0');
  }).join('');
}

function base64UrlEncode_(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function computeHmacSha256Base64Url_(text, secret) {
  const bytes = Utilities.computeHmacSha256Signature(
    String(text),
    String(secret),
    Utilities.Charset.UTF_8
  );
  return base64UrlEncode_(bytes);
}

function timingSafeEqual_(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
