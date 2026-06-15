import { NextRequest, NextResponse } from "next/server";
import { generateEmailHtml, generateEmailText } from "@/lib/email-template";
import { verifyAdmin } from "@/lib/api-auth";
import { validateEmail } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Email providers — configure via environment variables.
// See .env.local.example for the full list of required keys.
// ─────────────────────────────────────────────────────────────────────────────

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "no-reply@civilezy.in",
    to,
    subject,
    html,
    text,
  });
  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
}

async function sendViaSMTP(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "no-reply@civilezy.in",
    to,
    subject,
    html,
    text,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/send-email
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Authentication ───────────────────────────────────────────────────────
  const uid = await verifyAdmin(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { affiliateName, affiliateEmail, refId } = body as {
      affiliateName?: string;
      affiliateEmail?: string;
      refId?: string;
    };

    // ── Field presence validation ──────────────────────────────────────────
    if (!affiliateName?.trim() || !affiliateEmail?.trim() || !refId?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // ── Email format validation (server-side) ──────────────────────────────
    if (!validateEmail(affiliateEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const subject = "Welcome to Civilezy Affiliate Program";
    const html = generateEmailHtml({
      affiliateName: affiliateName.trim(),
      affiliateEmail: affiliateEmail.trim(),
      refId: refId.trim(),
    });
    const text = generateEmailText({
      affiliateName: affiliateName.trim(),
      affiliateEmail: affiliateEmail.trim(),
      refId: refId.trim(),
    });

    // ── Provider selection ─────────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(affiliateEmail.trim(), subject, html, text);
    } else if (process.env.SMTP_HOST) {
      await sendViaSMTP(affiliateEmail.trim(), subject, html, text);
    } else {
      return NextResponse.json(
        {
          error:
            "No email provider configured. Set RESEND_API_KEY or SMTP_* environment variables.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    // Log the full error server-side and surface a descriptive message to the
    // client so the admin sees the real reason instead of a generic failure.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-email]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
