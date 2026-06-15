export type ProductCategory = "course" | "bundle" | "ebook";

export interface Product {
  id: string;
  title: string;
  category: ProductCategory;
  /** Canonical EzyCourse checkout URL (existing query params already present). */
  purchaseUrl: string;
  /** Coupon code applied automatically for this product, if any. */
  defaultCoupon?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product catalogue — edit ONLY this file to add / remove / update products.
// Updating a product here automatically updates all generated links and emails.
// ─────────────────────────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  // ── Courses ────────────────────────────────────────────────────────────────
  {
    id: "iti-membership",
    title: "ITI Membership",
    category: "course",
    purchaseUrl:
      "https://learn.civilezy.in/en/checkout?product_id=4987&price_id=271682&product_type=membership",
  },
  {
    id: "diploma-membership",
    title: "Diploma Membership",
    category: "course",
    purchaseUrl:
      "https://learn.civilezy.in/en/checkout?product_id=5041&price_id=271680&product_type=membership",
  },
  {
    id: "btech-membership",
    title: "B.Tech Membership",
    category: "course",
    purchaseUrl:
      "https://learn.civilezy.in/en/checkout?product_id=5042&price_id=271509&product_type=membership",
  },
  {
    id: "surveyor-membership",
    title: "Surveyor Membership",
    category: "course",
    purchaseUrl:
      "https://learn.civilezy.in/en/checkout?product_id=4733&price_id=271684&product_type=membership",
  },

  // ── Bundles ─────────────────────────────────────────────────────────────────
  {
    id: "overseer-gr3",
    title: "Overseer Gr. III",
    category: "bundle",
    defaultCoupon: "ITI50",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6219&product_type=membership&price_id=288688",
  },
  {
    id: "overseer-gr1-instructor",
    title: "Overseer Gr. I / Instructor",
    category: "bundle",
    defaultCoupon: "DIPLOMA50",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6220&product_type=membership&price_id=288689",
  },
  {
    id: "assistant-engineer",
    title: "Assistant Engineer",
    category: "bundle",
    defaultCoupon: "BTECH50",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6221&product_type=membership&price_id=288691",
  },
  {
    id: "iti-kwa-bundle",
    title: "ITI + KWA Bundle",
    category: "bundle",
    defaultCoupon: "ITIPLUS50",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6222&product_type=membership&price_id=288692",
  },
  {
    id: "diploma-iti-kwa",
    title: "Diploma + ITI + KWA",
    category: "bundle",
    defaultCoupon: "DIPLOMAPLUS50",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6223&product_type=membership&price_id=288693",
  },
  {
    id: "ultimate-bundle",
    title: "Ultimate Bundle",
    category: "bundle",
    defaultCoupon: "BTECHPLUS50",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6224&product_type=membership&price_id=288694",
  },

  // ── E-Books ─────────────────────────────────────────────────────────────────
  {
    id: "kwa-gr2-ebook",
    title: "KWA GR.2 Quick Revision E-book",
    category: "ebook",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6216&product_type=membership&price_id=288593",
  },
  {
    id: "iti-ebook",
    title: "ITI Quick Revision E-book",
    category: "ebook",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6183&product_type=membership&price_id=287841",
  },
  {
    id: "btech-ebook",
    title: "B.Tech Quick Revision E-book",
    category: "ebook",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6150&product_type=membership&price_id=287247",
  },
  {
    id: "diploma-ebook",
    title: "Diploma Quick Revision E-book",
    category: "ebook",
    purchaseUrl:
      "https://learn.civilezy.in/checkout?product_id=6085&product_type=membership&price_id=285895",
  },
];

/** Total number of configured products — derived from PRODUCTS at module load. */
export const PRODUCT_COUNT = PRODUCTS.length;

/** Number of products that have an auto-applied coupon — derived from PRODUCTS. */
export const COUPON_COUNT = PRODUCTS.filter((p) => p.defaultCoupon).length;

// ─────────────────────────────────────────────────────────────────────────────
// URL generation — uses the URL API for safe, consistent parameter appending.
// No manual string concatenation; no double `&`; no malformed query strings.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the affiliate checkout URL for one product + refId.
 * Appends `coupon` (if configured) and `ref_id` via URLSearchParams so all
 * values are properly encoded and the resulting URL is never malformed.
 */
export function generateAffiliateUrl(product: Product, refId: string): string {
  const url = new URL(product.purchaseUrl);
  if (product.defaultCoupon) {
    url.searchParams.set("coupon", product.defaultCoupon);
  }
  url.searchParams.set("ref_id", refId);
  return url.toString();
}

/**
 * Extracts and trims the `ref_id` query parameter from an EzyCourse referral URL.
 * Returns `null` when the URL is invalid, the parameter is absent, or the value is blank.
 */
export function extractRefId(referralLink: string): string | null {
  const trimmed = referralLink.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const value = url.searchParams.get("ref_id");
    return value ? value.trim() || null : null;
  } catch {
    // Fallback for inputs that are missing the scheme or otherwise malformed
    const match = trimmed.match(/[?&]ref_id=([^&]+)/);
    if (!match) return null;
    const value = decodeURIComponent(match[1]).trim();
    return value || null;
  }
}

/** Groups the product catalogue by category in the canonical display order. */
export function groupByCategory(products: Product[]) {
  return {
    courses: products.filter((p) => p.category === "course"),
    bundles: products.filter((p) => p.category === "bundle"),
    ebooks: products.filter((p) => p.category === "ebook"),
  };
}
