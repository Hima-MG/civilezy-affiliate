import { NextRequest, NextResponse } from "next/server";
import { generateEmailHtml, generateEmailText } from "@/lib/email-template";
import { verifyAdmin } from "@/lib/api-auth";
import { validateEmail } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY environment variable is not set.");

  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM environment variable is not set.");

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({ from, to, subject, html, text });

  if (result.error) {
    // Resend returns structured errors — expose the full message for diagnosis
    throw new Error(
      `Resend API error: ${result.error.message ?? JSON.stringify(result.error)}`
    );
  }
}

async function sendViaSMTP(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host) throw new Error("SMTP_HOST environment variable is not set.");
  if (!from) throw new Error("EMAIL_FROM environment variable is not set.");

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({ from, to, subject, html, text });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/send-email
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Authentication ──────────────────────────────────────────────────────────
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

    // ── Field validation ────────────────────────────────────────────────────
    if (!affiliateName?.trim() || !affiliateEmail?.trim() || !refId?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!validateEmail(affiliateEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // ── Build email content ─────────────────────────────────────────────────
    const subject = "Welcome to Civilezy Affiliate Program";
    const emailData = {
      affiliateName: affiliateName.trim(),
      affiliateEmail: affiliateEmail.trim(),
      refId: refId.trim(),
    };
    const html = generateEmailHtml(emailData);
    const text = generateEmailText(emailData);

    // ── Dispatch ────────────────────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(affiliateEmail.trim(), subject, html, text);
    } else if (process.env.SMTP_HOST) {
      await sendViaSMTP(affiliateEmail.trim(), subject, html, text);
    } else {
      return NextResponse.json(
        {
          error:
            "No email provider configured. " +
            "Add RESEND_API_KEY (and EMAIL_FROM) to your Vercel environment variables.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    // Surface the real error to both the server logs and the client toast
    // so misconfiguration is immediately visible without reading Vercel logs.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-email ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
