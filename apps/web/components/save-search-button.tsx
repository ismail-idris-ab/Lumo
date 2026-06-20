'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface Props {
  searchParams: Record<string, string | undefined>;
}

export function SaveSearchButton({ searchParams }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Only show if at least one meaningful filter is active.
  const hasFilter = Object.values(searchParams).some(Boolean);
  if (!hasFilter) return null;

  function handleClick() {
    if (!user) {
      router.push('/login?next=' + encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/search'));
      return;
    }
    setShowModal(true);
  }

  async function saveSearch() {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (name.trim()) body.name = name.trim();
      if (searchParams.q) body.query = searchParams.q;
      if (searchParams.categoryId) body.categoryId = searchParams.categoryId;
      if (searchParams.state) body.state = searchParams.state;
      if (searchParams.condition) body.condition = searchParams.condition;
      if (searchParams.minPriceKobo) body.minPriceKobo = Number(searchParams.minPriceKobo);
      if (searchParams.maxPriceKobo) body.maxPriceKobo = Number(searchParams.maxPriceKobo);
      await api.post('/me/saved-searches', body);
      setSaved(true);
      setShowModal(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save search');
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700">
        🔖 Search saved
        <button
          type="button"
          onClick={() => router.push('/dashboard/saved-searches')}
          className="underline text-emerald-600 hover:text-emerald-800"
        >
          Manage
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
      >
        🔖 Save this search
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-base font-bold text-slate-800">Save this search</h2>
            <p className="mb-4 text-xs text-slate-500">
              We&apos;ll notify you when new matching listings are approved.
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional, e.g. iPhone 14)"
              maxLength={60}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSearch}
                disabled={loading}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Save search'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
