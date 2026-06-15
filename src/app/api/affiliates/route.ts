import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/api-auth";
import { validateEmail } from "@/lib/utils";

const COLLECTION = "affiliates";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/affiliates — list all affiliates, newest first
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const uid = await verifyAdmin(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await getAdminDb()
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    const affiliates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString(),
    }));

    return NextResponse.json({ affiliates });
  } catch (err) {
    console.error("[affiliates GET]", err);
    return NextResponse.json({ error: "Failed to fetch affiliates." }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/affiliates — create a new affiliate
// Stores: name, email, referralLink, refId, createdAt
// Does NOT store generated URLs — those are always computed at runtime.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const uid = await verifyAdmin(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, referralLink, refId } = body as {
      name?: string;
      email?: string;
      referralLink?: string;
      refId?: string;
    };

    // ── Field presence validation ────────────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !referralLink?.trim() || !refId?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // ── Email format validation (server-side — never trust the client alone) ─
    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getAdminDb();

    // ── Duplicate prevention ─────────────────────────────────────────────────
    const existing = await db
      .collection(COLLECTION)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: "An affiliate with this email already exists." },
        { status: 409 }
      );
    }

    // ── Persist affiliate metadata (no generated URLs stored) ────────────────
    const docRef = await db.collection(COLLECTION).add({
      name: name.trim(),
      email: normalizedEmail,
      referralLink: referralLink.trim(),
      refId: refId.trim(),
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("[affiliates POST]", err);
    return NextResponse.json({ error: "Failed to save affiliate." }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/affiliates?id=<docId> — permanently remove one affiliate
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const uid = await verifyAdmin(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id?.trim()) {
      return NextResponse.json({ error: "Missing affiliate ID." }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection(COLLECTION).doc(id.trim());
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[affiliates DELETE]", err);
    return NextResponse.json({ error: "Failed to delete affiliate." }, { status: 500 });
  }
}
