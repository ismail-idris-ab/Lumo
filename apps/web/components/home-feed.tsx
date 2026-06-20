'use client';
import { useState, useEffect } from 'react';
import type { SearchListing } from '@lumo/shared';
import { ListingFeed } from './listing-card';
import { useAuth } from '@/lib/auth-context';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

interface Props {
  initial: SearchListing[];
  totalPages: number;
}

export function HomeFeed({ initial, totalPages: initialTotalPages }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<SearchListing[]>(initial);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [nearState, setNearState] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.state) return;
    void (async () => {
      try {
        const res = await fetch(`${BASE}/search?sort=newest&limit=12&state=${encodeURIComponent(user.state!)}`);
        if (!res.ok) return;
        const data = await res.json() as { items: SearchListing[]; totalPages: number };
        if (data.items.length > 0) {
          setItems(data.items);
          setTotalPages(data.totalPages);
          setNearState(user.state!);
          setPage(1);
        }
      } catch { /* keep initial feed if fetch fails */ }
    })();
  }, [user?.state]);

  async function loadMore() {
    setLoading(true);
    try {
      const next = page + 1;
      const stateParam = nearState ? `&state=${encodeURIComponent(nearState)}` : '';
      const res = await fetch(`${BASE}/search?sort=newest&limit=12&page=${next}${stateParam}`);
      if (res.ok) {
        const data = await res.json() as { items: SearchListing[] };
        setItems((prev) => [...prev, ...data.items]);
        setPage(next);
      }
    } finally {
      setLoading(false);
    }
  }

  function resetToGlobal() {
    setItems(initial);
    setNearState(null);
    setPage(1);
    setTotalPages(initialTotalPages);
  }

  return (
    <div className="space-y-4">
      {nearState && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
          <span className="text-emerald-700">
            📍 Showing listings near <strong>{nearState}</strong>
          </span>
          <button
            type="button"
            onClick={resetToGlobal}
            className="text-xs text-emerald-600 underline"
          >
            See all
          </button>
        </div>
      )}
      <ListingFeed items={items} />
      {page < totalPages && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
