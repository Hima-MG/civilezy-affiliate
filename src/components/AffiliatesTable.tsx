"use client";

import { useState, useMemo } from "react";
import {
  Loader2,
  Mail,
  Trash2,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-fetch";
import ConfirmDialog from "@/components/ConfirmDialog";

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  referralLink: string;
  refId: string;
  createdAt: string;
}

interface Props {
  affiliates: Affiliate[];
  onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 50;

export default function AffiliatesTable({ affiliates, onDelete }: Props) {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** The affiliate pending confirmation before deletion — null means dialog is closed. */
  const [pendingDelete, setPendingDelete] = useState<Affiliate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Search filter ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return affiliates;
    return affiliates.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
  }, [affiliates, searchQuery]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  // Clamp current page so it never exceeds the available pages after a search
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const displayed = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    setCurrentPage(1); // always reset to page 1 on new search
  }

  // ── Resend email ──────────────────────────────────────────────────────────
  async function handleResend(affiliate: Affiliate) {
    setResendingId(affiliate.id);
    try {
      const res = await authFetch("/api/send-email", {
        method: "POST",
        body: JSON.stringify({
          affiliateName: affiliate.name,
          affiliateEmail: affiliate.email,
          refId: affiliate.refId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to resend email.");
      }
      toast.success(`Email resent to ${affiliate.email}.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend email.");
    } finally {
      setResendingId(null);
    }
  }

  // ── Delete (confirmed) ────────────────────────────────────────────────────
  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    const affiliate = pendingDelete;
    setPendingDelete(null); // close dialog immediately
    setDeletingId(affiliate.id);
    try {
      const res = await authFetch(`/api/affiliates?id=${affiliate.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete affiliate.");
      }
      toast.success(`${affiliate.name} deleted.`);
      onDelete(affiliate.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete affiliate.");
    } finally {
      setDeletingId(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Empty state — no affiliates at all
  // ─────────────────────────────────────────────────────────────────────────
  if (affiliates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
          <Users className="w-7 h-7 text-blue-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">No affiliates yet</h3>
        <p className="text-sm text-slate-400">Add your first affiliate using the button above.</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Search bar */}
      <div className="px-5 py-3 border-b border-slate-100">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search affiliates"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* No search results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-slate-500">
            No affiliates match &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">
                    Added
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-800">{a.name}</td>
                    <td className="px-5 py-4 text-slate-600">{a.email}</td>
                    <td className="px-5 py-4 text-slate-400 hidden md:table-cell">
                      {new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Resend */}
                        <button
                          onClick={() => handleResend(a)}
                          disabled={resendingId === a.id || !!deletingId}
                          title="Resend affiliate email with latest links"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {resendingId === a.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          {resendingId === a.id ? "Sending…" : "Resend Email"}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setPendingDelete(a)}
                          disabled={deletingId === a.id || !!resendingId}
                          title="Delete affiliate"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 border border-red-200 hover:border-red-400 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === a.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          {deletingId === a.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination — only shown when there is more than one page */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>
                {pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 tabular-nums">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog — replaces window.confirm() */}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Affiliate"
        description={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
