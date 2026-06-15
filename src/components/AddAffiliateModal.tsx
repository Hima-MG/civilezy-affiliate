"use client";

import { useState, useMemo } from "react";
import {
  extractRefId,
  PRODUCTS,
  generateAffiliateUrl,
  groupByCategory,
  Product,
} from "@/lib/products";
import { validateEmail } from "@/lib/utils";
import { authFetch } from "@/lib/auth-fetch";
import { toast } from "sonner";
import { X, Copy, Check, Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface GeneratedLink {
  product: Product;
  url: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function LinkRow({ item }: { item: GeneratedLink }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{item.product.title}</p>
          {item.product.defaultCoupon && (
            <span className="inline-block mt-0.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              🏷️ Coupon: {item.product.defaultCoupon}
            </span>
          )}
          <p className="mt-1 text-xs text-blue-600 break-all leading-relaxed">{item.url}</p>
        </div>
        <button
          onClick={copy}
          title="Copy this link"
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-md px-2.5 py-1.5 transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Section({
  emoji,
  title,
  items,
}: {
  emoji: string;
  title: string;
  items: GeneratedLink[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="font-semibold text-sm text-slate-700">
          {emoji} {title}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-4">
          {items.map((item) => (
            <LinkRow key={item.product.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

export default function AddAffiliateModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [referralLink, setReferralLink] = useState("");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [refIdError, setRefIdError] = useState("");

  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // ── Derive refId from the live referralLink value — no stale state ────────
  // This is always computed fresh from whatever is currently in the input,
  // so both "Preview Links" and "Generate & Send Email" always see the same,
  // up-to-date value regardless of click order.
  const currentRefId = useMemo(
    () => (referralLink.trim() ? extractRefId(referralLink.trim()) : null),
    [referralLink]
  );

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    let ok = true;
    setNameError("");
    setEmailError("");
    setRefIdError("");

    if (!name.trim()) {
      setNameError("Affiliate name is required.");
      ok = false;
    }
    if (!email.trim() || !validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      ok = false;
    }
    if (!currentRefId) {
      setRefIdError(
        referralLink.trim()
          ? "No ref_id found. Paste the full EzyCourse referral URL."
          : "EzyCourse referral link is required."
      );
      ok = false;
    }
    return ok;
  }

  // ── Preview Links ─────────────────────────────────────────────────────────
  function generateLinks() {
    if (!validate()) return;
    setGenerating(true);
    // currentRefId is guaranteed non-null by validate()
    const links = PRODUCTS.map((p) => ({
      product: p,
      url: generateAffiliateUrl(p, currentRefId!),
    }));
    setGeneratedLinks(links);
    setGenerating(false);
  }

  // ── Generate & Send Email ─────────────────────────────────────────────────
  async function handleSend() {
    if (!validate()) return;

    // CRITICAL: always re-extract refId from the current input value.
    // Never use previously-stored state — it may be stale if the admin
    // changed the referral link after clicking "Preview Links".
    const freshRefId = extractRefId(referralLink.trim());
    if (!freshRefId) {
      setRefIdError("Invalid EzyCourse referral link.");
      return;
    }

    setSending(true);
    try {
      // Step 1 — Save affiliate metadata to Firestore
      const saveRes = await authFetch("/api/affiliates", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          referralLink: referralLink.trim(),
          refId: freshRefId,
        }),
      });

      const saveData = await saveRes.json().catch(() => ({}));

      if (!saveRes.ok) {
        if (saveRes.status === 409) {
          // Duplicate email — tell the admin to use Resend from the table
          throw new Error(
            "An affiliate with this email already exists. Use 'Resend Email' from the affiliates table to resend their links."
          );
        }
        throw new Error(saveData.error ?? "Failed to save affiliate.");
      }

      // Step 2 — Send the affiliate email
      const emailRes = await authFetch("/api/send-email", {
        method: "POST",
        body: JSON.stringify({
          affiliateName: name.trim(),
          affiliateEmail: email.trim(),
          refId: freshRefId,
        }),
      });

      if (!emailRes.ok) {
        const emailData = await emailRes.json().catch(() => ({}));
        // Affiliate was saved successfully; email failed.
        // Inform the admin to use "Resend Email" from the table instead of
        // retrying the modal (which would create a duplicate).
        throw new Error(
          emailData.error ??
            "Affiliate saved, but the email failed to send. Use 'Resend Email' from the affiliates table."
        );
      }

      toast.success(`Affiliate added and email sent to ${email.trim()}.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  // ── Copy All ──────────────────────────────────────────────────────────────
  async function copyAll() {
    if (!generatedLinks.length) return;
    const { courses, bundles, ebooks } = groupByCategory(PRODUCTS);
    const lines: string[] = [];

    lines.push("📚 COURSES");
    lines.push("─".repeat(44));
    for (const p of courses) {
      const link = generatedLinks.find((l) => l.product.id === p.id);
      if (link) {
        lines.push(p.title);
        lines.push(link.url);
        lines.push("");
      }
    }

    lines.push("🎁 BUNDLES");
    lines.push("─".repeat(44));
    for (const p of bundles) {
      const link = generatedLinks.find((l) => l.product.id === p.id);
      if (link) {
        lines.push(p.title);
        if (p.defaultCoupon) lines.push(`Coupon: ${p.defaultCoupon}`);
        lines.push(link.url);
        lines.push("");
      }
    }

    lines.push("📖 E-BOOKS");
    lines.push("─".repeat(44));
    for (const p of ebooks) {
      const link = generatedLinks.find((l) => l.product.id === p.id);
      if (link) {
        lines.push(p.title);
        lines.push(link.url);
        lines.push("");
      }
    }

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success("All links copied to clipboard.");
  }

  // ── Derived display data ──────────────────────────────────────────────────
  const courseLinks = generatedLinks.filter((l) => l.product.category === "course");
  const bundleLinks = generatedLinks.filter((l) => l.product.category === "bundle");
  const ebookLinks = generatedLinks.filter((l) => l.product.category === "ebook");
  const hasLinks = generatedLinks.length > 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Add Affiliate</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Affiliate Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError("");
                }}
                placeholder="John Doe"
                className={cn(
                  "w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition",
                  nameError ? "border-red-400" : "border-slate-200"
                )}
              />
              {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Affiliate Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                placeholder="affiliate@example.com"
                className={cn(
                  "w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition",
                  emailError ? "border-red-400" : "border-slate-200"
                )}
              />
              {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
            </div>
          </div>

          {/* Referral link */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              EzyCourse Referral Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={referralLink}
              onChange={(e) => {
                setReferralLink(e.target.value);
                setRefIdError("");
                // Clear the preview whenever the link changes to prevent
                // the admin seeing links generated from a previous ref_id.
                setGeneratedLinks([]);
              }}
              placeholder="https://learn.civilezy.in?ref_id=clvj7k1ar..."
              className={cn(
                "w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono",
                refIdError ? "border-red-400" : "border-slate-200"
              )}
            />
            {refIdError && <p className="mt-1 text-xs text-red-600">{refIdError}</p>}
            {/* Live ref_id indicator — derived directly from the input, never from state */}
            {currentRefId && (
              <p className="mt-1 text-xs text-green-600 font-mono">
                ✓ ref_id: <span className="font-semibold">{currentRefId}</span>
              </p>
            )}
          </div>

          {/* Preview button */}
          <button
            type="button"
            onClick={generateLinks}
            disabled={generating}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 rounded-lg px-4 py-2 transition-colors disabled:opacity-60"
          >
            {generating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {generating ? "Generating…" : "Preview Links"}
          </button>

          {/* Generated links preview */}
          {hasLinks && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  Generated Links
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    ({generatedLinks.length} links)
                  </span>
                </h3>
                <button
                  onClick={copyAll}
                  title="Copy all links to clipboard"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-md px-3 py-1.5 transition-colors"
                >
                  {copiedAll ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedAll ? "Copied All" : "Copy All"}
                </button>
              </div>
              <Section emoji="📚" title="Courses" items={courseLinks} />
              <Section emoji="🎁" title="Bundles" items={bundleLinks} />
              <Section emoji="📖" title="E-Books" items={ebookLinks} />
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? "Sending…" : "Generate & Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
