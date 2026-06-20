import { PRODUCTS, REFERRAL_COUPON, generateAffiliateUrl, groupByCategory, Product } from "./products";
import { escapeHtml } from "./utils";

export interface EmailData {
  affiliateName: string;
  affiliateEmail: string;
  refId: string;
}

/**
 * Renders a single product row for the HTML email.
 * All user-supplied and dynamic strings are HTML-escaped before injection.
 */
function renderProductRow(product: Product, refId: string): string {
  const url = generateAffiliateUrl(product, refId);
  const safeUrl = escapeHtml(url);
  const safeTitle = escapeHtml(product.title);

  // Bundles show their own 50% coupon; courses/ebooks show REFERRAL_COUPON.
  const displayCoupon =
    product.category === "bundle" ? product.defaultCoupon : REFERRAL_COUPON;

  const couponLine = displayCoupon
    ? `<p style="margin:2px 0 6px; color:#d97706; font-size:13px; font-weight:600;">&#127991; Coupon: ${escapeHtml(displayCoupon)}</p>`
    : "";

  return `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid #f0f0f0;">
        <p style="margin:0 0 4px; font-weight:600; color:#1e293b; font-size:14px;">${safeTitle}</p>
        ${couponLine}
        <a href="${safeUrl}" style="color:#2563eb; font-size:12px; word-break:break-all; text-decoration:none;">${safeUrl}</a>
      </td>
    </tr>
  `;
}

function section(emoji: string, title: string, rows: string): string {
  return `
    <tr>
      <td style="padding:24px 0 8px;">
        <h2 style="margin:0 0 12px; font-size:16px; font-weight:700; color:#0f172a; border-bottom:2px solid #2563eb; padding-bottom:8px;">
          ${emoji} ${escapeHtml(title)}
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows}
        </table>
      </td>
    </tr>
  `;
}

export function generateEmailHtml(data: EmailData): string {
  const { affiliateName, refId } = data;
  const safeName = escapeHtml(affiliateName.trim());
  const safeCoupon = escapeHtml(REFERRAL_COUPON);

  const { courses, bundles, ebooks } = groupByCategory(PRODUCTS);

  const courseRows = courses.map((p) => renderProductRow(p, refId)).join("");
  const bundleRows = bundles.map((p) => renderProductRow(p, refId)).join("");
  const ebookRows = ebooks.map((p) => renderProductRow(p, refId)).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Civilezy Affiliate Program</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="640" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;max-width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Civilezy</h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Affiliate Program</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 20px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${safeName}</strong>,</p>
              <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">
                Welcome to the <strong>Civilezy Affiliate Program</strong>! We&apos;re excited to have you on board.
                Below are your personalised affiliate links for all our products.
                Share them with your audience to start earning commissions on every successful enrollment.
              </p>
            </td>
          </tr>

          <!-- Referral Coupon Banner -->
          <tr>
            <td style="padding:0 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:10px;border:1.5px solid #f59e0b;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#92400e;">&#127881; Exclusive Referral Offer</p>
                    <p style="margin:0 0 12px;font-size:12px;color:#a16207;">Your audience gets 10% OFF on all Membership Courses and Quick Revision E-Books.</p>
                    <p style="margin:0 0 2px;font-size:12px;color:#a16207;font-weight:600;">Use Coupon Code:</p>
                    <p style="margin:0 0 12px;display:inline-block;font-size:22px;font-weight:800;letter-spacing:3px;color:#78350f;background:#ffffff;border:2px dashed #f59e0b;border-radius:6px;padding:8px 20px;">${safeCoupon}</p>
                    <p style="margin:0;font-size:11px;color:#a16207;">
                      &#10003; ITI Membership &nbsp;
                      &#10003; Diploma Membership &nbsp;
                      &#10003; B.Tech Membership &nbsp;
                      &#10003; Surveyor Membership<br/>
                      &#10003; All Quick Revision E-Books
                    </p>
                    <p style="margin:8px 0 0;font-size:11px;color:#b45309;font-style:italic;">
                      Note: Our Bundle Courses already include 50% OFF and use their own coupon codes.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Product sections -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${section("📚", "Courses", courseRows)}
                ${section("🎁", "Bundles (50% OFF)", bundleRows)}
                ${section("📖", "E-Books", ebookRows)}
              </table>

              <p style="margin:32px 0 0;color:#6b7280;font-size:13px;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:24px;">
                If you have any questions, reply to this email and our team will get back to you shortly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Best Regards, <strong style="color:#374151;">Team Civilezy</strong><br/>
                <a href="https://civilezy.in" style="color:#2563eb;text-decoration:none;">civilezy.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateEmailText(data: EmailData): string {
  const { affiliateName, refId } = data;
  const { courses, bundles, ebooks } = groupByCategory(PRODUCTS);

  const lines: string[] = [
    `Hi ${affiliateName.trim()},`,
    "",
    "Welcome to the Civilezy Affiliate Program.",
    "",
    "================================",
    "🎉 EXCLUSIVE REFERRAL OFFER",
    "================================",
    `Coupon Code: ${REFERRAL_COUPON}`,
    "",
    "Applicable On:",
    "  ✓ ITI Membership",
    "  ✓ Diploma Membership",
    "  ✓ B.Tech Membership",
    "  ✓ Surveyor Membership",
    "  ✓ All Quick Revision E-Books",
    "",
    "Note: Our Bundle Courses already include 50% OFF and use their own coupon codes.",
    "================================",
    "",
    "================================",
    "📚 COURSES",
    "================================",
  ];

  for (const p of courses) {
    lines.push(p.title);
    lines.push(`Coupon: ${REFERRAL_COUPON}`);
    lines.push(generateAffiliateUrl(p, refId));
    lines.push("");
  }

  lines.push("================================");
  lines.push("🎁 BUNDLES (50% OFF)");
  lines.push("================================");

  for (const p of bundles) {
    lines.push(p.title);
    if (p.defaultCoupon) lines.push(`Coupon: ${p.defaultCoupon}`);
    lines.push(generateAffiliateUrl(p, refId));
    lines.push("");
  }

  lines.push("================================");
  lines.push("📖 E-BOOKS");
  lines.push("================================");

  for (const p of ebooks) {
    lines.push(p.title);
    lines.push(`Coupon: ${REFERRAL_COUPON}`);
    lines.push(generateAffiliateUrl(p, refId));
    lines.push("");
  }

  lines.push("================================");
  lines.push("");
  lines.push("Share these links with your audience and earn commissions on successful enrollments.");
  lines.push("");
  lines.push("Best Regards,");
  lines.push("Team Civilezy");

  return lines.join("\n");
}
