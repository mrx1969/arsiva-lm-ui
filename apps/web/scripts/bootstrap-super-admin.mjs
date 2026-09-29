import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Environment variable ${name} wajib diisi.`);
  return value;
}

const username = required("BOOTSTRAP_ADMIN_USERNAME").toLowerCase();
const password = required("BOOTSTRAP_ADMIN_PASSWORD");
const displayName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Super Admin";
const domain = process.env.AUTH_USERNAME_DOMAIN?.trim() || "users.arsiva.internal";

if (!/^[a-z0-9](?:[a-z0-9._-]{1,38}[a-z0-9])?$/.test(username)) throw new Error("Format BOOTSTRAP_ADMIN_USERNAME tidak valid.");
if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  throw new Error("BOOTSTRAP_ADMIN_PASSWORD minimal 12 karakter dan wajib memiliki huruf besar, huruf kecil, angka, serta simbol.");
}

const app = initializeApp({
  credential: cert({
    projectId: required("FIREBASE_PROJECT_ID"),
    clientEmail: required("FIREBASE_CLIENT_EMAIL"),
    privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n")
  })
});
const auth = getAuth(app);
const email = `${username}@${domain}`;
let user;

try {
  user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password, displayName, disabled: false, emailVerified: true });
} catch (error) {
  if (error?.code !== "auth/user-not-found") throw error;
  user = await auth.createUser({ email, password, displayName, disabled: false, emailVerified: true });
}

await auth.setCustomUserClaims(user.uid, { username, role: "SUPER_ADMIN", forcePasswordChange: true });
await auth.revokeRefreshTokens(user.uid);
console.log(`Super Admin '${username}' siap. Hapus BOOTSTRAP_ADMIN_PASSWORD dari environment, lalu login dan ganti password.`);
