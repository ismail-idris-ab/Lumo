'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { CategorySummary } from '@lumo/shared';

// ── Icon mapping ──────────────────────────────────────────────────────────────

// Slug-exact lookup — takes priority over keyword matching.
const SLUG_ICONS: Record<string, string> = {
  // Phones & Tablets subcategories
  'smartphones': '📱',
  'tablets': '🖥️',
  'phone-accessories': '🔌',
  'smart-watches-wearables': '⌚',
  'phone-parts-components': '🔋',
  'phone-tablet-repair': '🔧',
  // Electronics subcategories
  'laptops-computers': '💻',
  'tvs-monitors': '📺',
  'audio-speakers': '🔊',
  'cameras': '📷',
  'gaming': '🎮',
  'computer-accessories': '🖱️',
  // Vehicles
  'cars': '🚗',
  'motorcycles': '🏍️',
  'trucks-buses': '🚛',
  'vehicle-parts': '⚙️',
  'boats': '⛵',
  // Property
  'houses-for-sale': '🏠',
  'houses-for-rent': '🔑',
  'land-plots': '📐',
  'commercial-property': '🏢',
  'short-let': '🛏️',
  // Services
  'home-services': '🧹',
  'tech-it-services': '💾',
  'education-lessons': '📚',
  'health-wellness': '💊',
  'events-entertainment': '🎉',
  'fashion-beauty': '💄',
};

const ICON_MAP: Array<[string, string]> = [
  ['laptop', '💻'], ['computer', '💻'], ['desktop', '💻'],
  ['tv', '📺'], ['television', '📺'], ['screen', '📺'],
  ['camera', '📷'], ['photo', '📷'],
  ['audio', '🎧'], ['speaker', '🔊'], ['headphone', '🎧'],
  ['gaming', '🎮'], ['game', '🎮'], ['console', '🎮'],
  ['car', '🚗'], ['vehicle', '🚗'], ['truck', '🚛'], ['bus', '🚌'],
  ['motor', '🏍️'], ['bike', '🚲'], ['bicycle', '🚲'],
  ['boat', '⛵'], ['ship', '🚢'],
  ['house', '🏠'], ['home', '🏠'], ['apartment', '🏠'], ['flat', '🏠'],
  ['land', '📐'], ['property', '🏠'], ['real estate', '🏠'],
  ['fashion', '👗'], ['cloth', '👗'], ['wear', '👗'], ['dress', '👗'],
  ['shoe', '👟'], ['bag', '👜'], ['watch', '⌚'], ['jewel', '💍'],
  ['furniture', '🪑'], ['sofa', '🛋️'], ['bed', '🛏️'],
  ['kitchen', '🍳'], ['appliance', '🏠'], ['refrigerator', '❄️'],
  ['health', '💊'], ['medical', '💊'], ['beauty', '💄'], ['cosmetic', '💄'],
  ['sport', '⚽'], ['fitness', '🏋️'], ['gym', '🏋️'],
  ['baby', '🍼'], ['kid', '🧸'], ['toy', '🧸'], ['child', '🧸'],
  ['book', '📚'], ['education', '📚'], ['school', '📚'],
  ['music', '🎵'], ['instrument', '🎸'],
  ['art', '🎨'], ['craft', '🎨'],
  ['phone', '📱'], ['mobile', '📱'], ['tablet', '🖥️'],
  ['food', '🍱'], ['restaurant', '🍽️'], ['catering', '🍽️'],
  ['pet', '🐾'], ['animal', '🐾'],
  ['agriculture', '🌾'], ['farm', '🌾'], ['crop', '🌾'],
  ['tool', '🔧'], ['machinery', '⚙️'], ['equipment', '⚙️'],
  ['service', '🤝'], ['repair', '🔧'], ['cleaning', '🧹'],
  ['job', '💼'], ['work', '💼'], ['career', '💼'],
  ['electronic', '⚡'],
];

function getIcon(name: string, slug?: string): string {
  if (slug && SLUG_ICONS[slug]) return SLUG_ICONS[slug];
  const lower = name.toLowerCase();
  for (const [key, icon] of ICON_MAP) {
    if (lower.includes(key)) return icon;
  }
  return '📦';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
  categories: CategorySummary[];
  selectedId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function CategoryDrawer({ open, onClose, onSelect, categories, selectedId, triggerRef }: Props) {
  const [level, setLevel] = useState<'parent' | 'sub'>('parent');
  const [activeParent, setActiveParent] = useState<CategorySummary | null>(null);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Mount / position / animate ─────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setLevel('parent');
      setActiveParent(null);
      setSearch('');

      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }

      setMounted(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );

      setTimeout(() => searchRef.current?.focus(), 80);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 160);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Close on outside click / Escape ───────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, triggerRef]);

  // ── Scroll to keep dropdown in viewport ───────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function onScroll() {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open, triggerRef]);

  if (!mounted) return null;

  // ── Data ──────────────────────────────────────────────────────────────────

  const baseRows = level === 'parent' ? categories : (activeParent?.children ?? []);

  const filtered = search.trim()
    ? categories
        .flatMap((c) => [c, ...(c.children ?? [])])
        .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : baseRows;

  function handleRowClick(cat: CategorySummary) {
    if (search.trim()) {
      const hasChildren = (cat.children ?? []).length > 0;
      if (hasChildren) {
        setActiveParent(cat);
        setLevel('sub');
        setSearch('');
      } else {
        onSelect(cat.id);
        onClose();
      }
    } else if (level === 'parent') {
      const hasChildren = (cat.children ?? []).length > 0;
      if (hasChildren) {
        setActiveParent(cat);
        setLevel('sub');
      } else {
        onSelect(cat.id);
        onClose();
      }
    } else {
      onSelect(cat.id);
      onClose();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={panelRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10',
        'transition-all duration-150 ease-out origin-top',
        visible ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-1',
      )}
    >
      {/* Search + back */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-2.5 py-2">
        {level === 'sub' && !search && (
          <button
            type="button"
            onClick={() => { setLevel('parent'); setActiveParent(null); }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Back"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={level === 'sub' && activeParent ? `Search in ${activeParent.name}…` : 'Search categories…'}
            className="w-full rounded-lg border border-transparent bg-slate-50 py-1.5 pl-7 pr-6 text-xs text-slate-700 placeholder:text-slate-400 transition-colors focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb pill */}
      {level === 'sub' && !search && activeParent && (
        <div className="flex items-center gap-1 border-b border-slate-50 bg-slate-50/60 px-3 py-1.5">
          <span className="text-[10px] text-slate-400">Categories</span>
          <svg className="text-slate-300" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <span>{getIcon(activeParent.name, activeParent.slug)}</span>
            {activeParent.name}
          </span>
        </div>
      )}

      {/* List */}
      <ul className="max-h-60 overflow-y-auto overscroll-contain py-1">
        {filtered.length === 0 && (
          <li className="px-4 py-5 text-center text-xs text-slate-400">
            No categories match &ldquo;{search}&rdquo;
          </li>
        )}

        {filtered.map((cat) => {
          const hasChildren = (cat.children ?? []).length > 0 && !search.trim();
          const isSelected = selectedId === cat.id;
          const icon = getIcon(cat.name, cat.slug);

          return (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => handleRowClick(cat)}
                className={cn(
                  'group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                {/* Icon */}
                <span className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-colors',
                  isSelected ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-slate-200',
                )}>
                  {icon}
                </span>

                {/* Name */}
                <span className={cn(
                  'flex-1 text-xs font-medium',
                  isSelected ? 'text-emerald-800' : 'text-slate-700',
                )}>
                  {cat.name}
                  {search.trim() && cat.parentId && (
                    <span className="ml-1 text-slate-400">
                      · {categories.find((p) => p.id === cat.parentId)?.name}
                    </span>
                  )}
                </span>

                {/* Right indicator */}
                {hasChildren ? (
                  <svg className="text-slate-300 transition-colors group-hover:text-slate-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                ) : isSelected ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer count */}
      <div className="border-t border-slate-50 px-3 py-1.5 text-[10px] text-slate-400">
        {search.trim() ? (
          <>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</>
        ) : level === 'sub' && activeParent ? (
          <>{filtered.length} subcategor{filtered.length !== 1 ? 'ies' : 'y'} in {activeParent.name}</>
        ) : (
          <>{categories.length} categories</>
        )}
      </div>
    </div>
  );
}
