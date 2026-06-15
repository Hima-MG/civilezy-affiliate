import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

/**
 * Verifies the Firebase ID token supplied in the Authorization header.
 *
 * Returns the authenticated user's UID on success, or null if the token is
 * missing, malformed, expired, or otherwise invalid.
 *
 * Usage in every API route handler:
 *   const uid = await verifyAdmin(req);
 *   if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function verifyAdmin(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
