import { cert, initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Administrator diagnostic: read-only page checks with a five-minute session.
// Credentials and tokens stay in memory and are never printed or saved.
const origin = 'https://arsiva-lm-ui.vercel.app';
const app = initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
}) });

try {
  const auth = getAuth(app);
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME || 'superadmin';
  const domain = process.env.AUTH_USERNAME_DOMAIN || 'users.arsiva.internal';
  const user = await auth.getUserByEmail(`${username}@${domain}`);
  if (user.disabled || user.customClaims?.role !== 'SUPER_ADMIN' || user.customClaims?.forcePasswordChange) {
    throw new Error('ADMIN_ACCOUNT_NOT_READY');
  }
  const token = await auth.createCustomToken(user.uid);
  const signedIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_WEB_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, returnSecureToken: true }), signal: AbortSignal.timeout(20000)
  });
  if (!signedIn.ok) throw new Error('DIAGNOSTIC_SIGN_IN_FAILED');
  const { idToken } = await signedIn.json();
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: 300000 });
  const cookieName = process.env.SESSION_COOKIE_NAME || 'arsiva_session';
  for (const route of ['/settings', '/dashboard', '/archives', '/master/divisions', '/master/units', '/storage']) {
    const response = await fetch(origin + route, {
      headers: { Cookie: `${cookieName}=${cookie}` }, redirect: 'manual', signal: AbortSignal.timeout(45000)
    });
    const html = await response.text();
    const healthy = route === '/settings'
      ? html.includes('Spreadsheet terhubung; akses API aktif')
      : response.ok && !/NEXT_REDIRECT|data awal|belum tersambung|masih memakai/.test(html);
    console.log(JSON.stringify({ route, status: response.status, connected: healthy }));
    if (!healthy) process.exitCode = 1;
  }
  const guest = await fetch(origin + '/settings', { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const guestHtml = await guest.text();
  const loginRequired = guest.headers.get('location')?.includes('/login') || guestHtml.includes('NEXT_REDIRECT') && guestHtml.includes('/login');
  console.log(JSON.stringify({ guestLoginRequired: Boolean(loginRequired) }));
  if (!loginRequired) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ verificationFailed: error.code || (/^[A-Z_]+$/.test(error.message) ? error.message : 'CHECK_FAILED') }));
  process.exitCode = 1;
} finally {
  await deleteApp(app);
}
