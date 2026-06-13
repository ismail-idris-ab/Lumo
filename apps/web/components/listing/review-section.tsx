'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api-client';
import type { SellerReviewDTO } from '@lumo/shared';

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className={`text-2xl transition ${(hover || value) >= n ? 'text-amber-400' : 'text-slate-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

interface Props {
  listingId: string;
  sellerId: string;
  slug: string;
  initialReviews: SellerReviewDTO[];
  initialTotal: number;
}

export function ReviewSection({ listingId, sellerId, slug, initialReviews, initialTotal }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [total, setTotal] = useState(initialTotal);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isOwner = user?.id === sellerId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { router.push(`/login?next=/listing/${slug}`); return; }
    if (rating === 0) { setError('Pick a star rating'); return; }
    setBusy(true);
    setError(null);
    try {
      const { review } = await api.post<{ review: SellerReviewDTO }>(
        `/listings/${listingId}/reviews`,
        { rating, body: body.trim() || undefined },
      );
      setReviews((r) => [review, ...r]);
      setTotal((t) => t + 1);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'You already reviewed this listing.'
          : 'Could not submit review. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-base font-semibold text-slate-800">
        Seller reviews{total > 0 && <span className="ml-1 text-slate-400">({total})</span>}
      </h2>

      {!isOwner && !done && (
        <form onSubmit={submit} className="mb-5 space-y-3 border-b border-slate-100 pb-5">
          <p className="text-sm text-slate-600">Rate your experience with this seller:</p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Optional comment…"
            maxLength={1000}
            rows={3}
            className="w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-emerald-500"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      )}

      {done && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✔ Review submitted — thank you!
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-400">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-slate-100 pb-3 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{r.authorName}</span>
                <span className="text-amber-400">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {r.body && <p className="mt-1 text-sm text-slate-600">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
