import { auth } from "@/lib/firebase";

/**
 * A drop-in replacement for `fetch` that automatically attaches the current
 * Firebase user's ID token as an `Authorization: Bearer <token>` header.
 *
 * - Throws a descriptive error if no user is signed in.
 * - Sets `Content-Type: application/json` automatically when a body is present.
 * - Token is always freshly requested (Firebase SDK caches and refreshes it).
 *
 * Use this for every client-side API call so all endpoints receive auth.
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Session expired. Please sign in again.");

  const token = await user.getIdToken();

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...init, headers });
}
