import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Konfigurasi ${name} belum diisi.`);
  return value;
}

export function getFirebaseAuth() {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: required("FIREBASE_PROJECT_ID"),
        clientEmail: required("FIREBASE_CLIENT_EMAIL"),
        privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n")
      })
    });
  return getAuth(app);
}
