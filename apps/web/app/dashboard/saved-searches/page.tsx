'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import type { SavedSearchDTO } from '@lumo/shared';

function filtersLabel(ss: SavedSearchDTO): string {
  const parts: string[] = [];
  if (ss.query) parts.push(`"${ss.query}"`);
  if (ss.state) parts.push(ss.state);
  if (ss.condition) parts.push(ss.condition.replace('_', ' ').toLowerCase());
  if (ss.minPriceKobo != null || ss.maxPriceKobo != null) {
    const min = ss.minPriceKobo != null ? `₦${(ss.minPriceKobo / 100).toLocaleString()}` : '';
    const max = ss.maxPriceKobo != null ? `₦${(ss.maxPriceKobo / 100).toLocaleString()}` : '';
    if (min && max) parts.push(`${min}–${max}`);
    else if (min) parts.push(`from ${min}`);
    else if (max) parts.push(`up to ${max}`);
  }
  return parts.join(' · ') || 'All listings';
}

function buildSearchUrl(ss: SavedSearchDTO): string {
  const p = new URLSearchParams();
  if (ss.query) p.set('q', ss.query);
  if (ss.state) p.set('state', ss.state);
  if (ss.condition) p.set('condition', ss.condition);
  if (ss.minPriceKobo != null) p.set('minPriceKobo', String(ss.minPriceKobo));
  if (ss.maxPriceKobo != null) p.set('maxPriceKobo', String(ss.maxPriceKobo));
  if (ss.categoryId) p.set('categoryId', ss.categoryId);
  return `/search?${p.toString()}`;
}

export default function SavedSearchesPage() {
  const [items, setItems] = useState<SavedSearchDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ items: SavedSearchDTO[] }>('/me/saved-searches')
      .then((d) => setItems(d.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  async function deleteSavedSearch(id: string) {
    setDeleting(id);
    try {
      await api.delete(`/me/saved-searches/${id}`);
      setItems((prev) => prev.filter((ss) => ss.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Saved Searches</h1>
        <p className="mt-1 text-sm text-slate-500">
          Get notified instantly when new listings match your search.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-2xl mb-2">🔖</p>
          <p className="text-sm font-medium text-slate-600">No saved searches yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Run a search with filters and click &ldquo;Save this search&rdquo;.
          </p>
          <Link
            href="/search"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Browse listings
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((ss) => (
            <div
              key={ss.id}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                {ss.name && (
                  <p className="font-semibold text-slate-800 truncate">{ss.name}</p>
                )}
                <p className="text-sm text-slate-500 truncate">{filtersLabel(ss)}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Saved {new Date(ss.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={buildSearchUrl(ss)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => deleteSavedSearch(ss.id)}
                  disabled={deleting === ss.id}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-rose-600 disabled:opacity-50"
                >
                  {deleting === ss.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
