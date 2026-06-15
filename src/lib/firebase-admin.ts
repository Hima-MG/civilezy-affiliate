import * as admin from "firebase-admin";

/**
 * Ensures the Firebase Admin SDK is initialised exactly once.
 * Called lazily — only when a request actually reaches an API route,
 * not at module evaluation time. This avoids build-time crashes when
 * environment variables are not present in the build environment.
 *
 * Throws a descriptive error when required env vars are missing so that
 * misconfiguration is immediately obvious in server logs.
 */
function ensureInitialized(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK is not configured. " +
        "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY " +
        "in your environment variables (.env.local for development, hosting config for production)."
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      // Cloud providers store newlines as the literal string \n — convert back
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Returns the Firestore Admin instance.
 * Call this inside request handlers — never at the module top level.
 */
export function getAdminDb() {
  return ensureInitialized().firestore();
}

/**
 * Returns the Auth Admin instance.
 * Call this inside request handlers — never at the module top level.
 */
export function getAdminAuth() {
  return ensureInitialized().auth();
}
