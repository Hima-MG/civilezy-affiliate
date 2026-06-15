"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";
import { authFetch } from "@/lib/auth-fetch";
import { PRODUCT_COUNT, COUPON_COUNT } from "@/lib/products";
import AddAffiliateModal from "@/components/AddAffiliateModal";
import AffiliatesTable, { Affiliate } from "@/components/AffiliatesTable";
import { Loader2, LogOut, Plus, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — shown while the affiliates list is loading
// ─────────────────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/5" />
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-4 bg-slate-200 rounded w-1/6 hidden md:block" />
          <div className="flex gap-2 ml-auto">
            <div className="h-7 bg-slate-200 rounded w-20" />
            <div className="h-7 bg-slate-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchAffiliates = useCallback(async () => {
    setFetching(true);
    try {
      const res = await authFetch("/api/affiliates");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load affiliates.");
      }
      const data = await res.json();
      setAffiliates(data.affiliates ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load affiliates.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAffiliates();
  }, [user, fetchAffiliates]);

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  function handleDelete(id: string) {
    setAffiliates((prev) => prev.filter((a) => a.id !== id));
  }

  // ── Auth loading ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // useAuth redirects to /login when unauthenticated — render nothing here
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top navigation bar ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Civilezy</span>
              <span className="text-slate-400 text-sm ml-1.5">Affiliate Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 rounded-lg px-3 py-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Page title + action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Affiliates</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {affiliates.length} affiliate{affiliates.length !== 1 ? "s" : ""} registered
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAffiliates}
              disabled={fetching}
              title="Refresh affiliate list"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-400 rounded-lg transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Affiliate
            </button>
          </div>
        </div>

        {/* ── Stats cards — computed from PRODUCTS, never hardcoded ─────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Total affiliates */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{affiliates.length}</p>
                <p className="text-xs text-slate-500">Total Affiliates</p>
              </div>
            </div>
          </div>

          {/* Products configured — derived from PRODUCTS array */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <span className="text-lg">📚</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{PRODUCT_COUNT}</p>
                <p className="text-xs text-slate-500">Products Configured</p>
              </div>
            </div>
          </div>

          {/* Auto-applied coupons — derived from PRODUCTS array */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <span className="text-lg">🏷️</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{COUPON_COUNT}</p>
                <p className="text-xs text-slate-500">Auto-Applied Coupons</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Affiliates table ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">All Affiliates</h2>
          </div>

          {/* Show skeleton while loading, then the table */}
          {fetching ? (
            <TableSkeleton />
          ) : (
            <AffiliatesTable affiliates={affiliates} onDelete={handleDelete} />
          )}
        </div>
      </main>

      {/* ── Add affiliate modal ───────────────────────────────────────────── */}
      {showModal && (
        <AddAffiliateModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchAffiliates}
        />
      )}
    </div>
  );
}
