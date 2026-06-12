import { formatNaira } from '@/lib/format';

interface Props {
  priceKobo: number;
  marketLowKobo: number;
  marketHighKobo: number;
}

export function MarketPriceCard({ priceKobo, marketLowKobo, marketHighKobo }: Props) {
  const span = marketHighKobo - marketLowKobo;
  const rel = span > 0 ? (priceKobo - marketLowKobo) / span : 0.5;
  const markerPct = Math.min(Math.max(rel, 0), 1) * 100;
  const belowMarket = priceKobo < marketLowKobo;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-600">Market price</span>
        <span className="font-semibold text-slate-800">
          {formatNaira(marketLowKobo)} ~ {formatNaira(marketHighKobo)}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400">
        <div
          className="absolute -top-1 h-4 w-1 rounded-full bg-slate-900"
          style={{ left: `calc(${markerPct}% - 2px)` }}
        />
      </div>
      {belowMarket && (
        <p className="mt-2 text-xs font-medium text-emerald-700">
          Priced below the typical range — verify condition before paying.
        </p>
      )}
    </div>
  );
}
