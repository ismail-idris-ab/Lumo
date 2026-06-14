'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const NG_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT - Abuja','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
];

const CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'USED', label: 'Used' },
  { value: 'FOR_PARTS', label: 'For parts' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
];

const sel =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500';

export function SearchFilters({
  currentState,
  currentCondition,
  currentSort,
  currentMinPrice,
  currentMaxPrice,
}: {
  currentState?: string;
  currentCondition?: string;
  currentSort?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState(currentState ?? '');
  const [condition, setCondition] = useState(currentCondition ?? '');
  const [sort, setSort] = useState(currentSort ?? 'newest');
  const [minPrice, setMinPrice] = useState(currentMinPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice ?? '');

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    state ? params.set('state', state) : params.delete('state');
    condition ? params.set('condition', condition) : params.delete('condition');
    sort && sort !== 'newest' ? params.set('sort', sort) : params.delete('sort');

    const min = Number(minPrice);
    const max = Number(maxPrice);
    min > 0 ? params.set('minPriceKobo', String(min * 100)) : params.delete('minPriceKobo');
    max > 0 ? params.set('maxPriceKobo', String(max * 100)) : params.delete('maxPriceKobo');

    router.push(`/search?${params.toString()}`);
  }

  function clear() {
    setState(''); setCondition(''); setSort('newest'); setMinPrice(''); setMaxPrice('');
    const params = new URLSearchParams(searchParams.toString());
    ['state','condition','sort','minPriceKobo','maxPriceKobo','page'].forEach(k => params.delete(k));
    router.push(`/search?${params.toString()}`);
  }

  const hasFilters = state || condition || (sort && sort !== 'newest') || minPrice || maxPrice;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        {/* State */}
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">State</label>
          <select className={sel} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">All states</option>
            {NG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Condition */}
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Condition</label>
          <select className={sel} value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">Any</option>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Price range */}
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Price (₦)</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-emerald-500"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="min-w-[170px] flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sort</label>
          <select className={sel} value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={apply}
            className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Apply
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={clear}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-500 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
