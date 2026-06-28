import Link from 'next/link';
import { NG_STATES } from '@lumo/shared';
import { getCategoryTree } from '@/lib/api';
import { toSlug } from '@/lib/states';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo';

const linkCls =
  'rounded-sm text-slate-400 transition-colors hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400';

// The state/category clouds aren't decoration — they're the site's real internal-linking
// surface for the location×category SEO landing pages (every page footer-links into them).
export async function SiteFooter() {
  const categories = await getCategoryTree();

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container space-y-8 py-12">
        <div className="grid gap-8 sm:grid-cols-[1.3fr_1fr_1fr]">
          <div className="space-y-2">
            <Link
              href="/"
              className="rounded-sm text-lg font-bold text-white transition-colors hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {SITE_NAME}
            </Link>
            <p className="max-w-xs text-sm text-slate-400">{SITE_DESCRIPTION}</p>
          </div>

          <nav aria-label="Marketplace" className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Marketplace</p>
            <div className="flex flex-col gap-1.5 text-sm">
              <Link href="/search" className={linkCls}>Browse listings</Link>
              <Link href="/new" className={linkCls}>Post an ad</Link>
              <Link href="/register" className={linkCls}>Create account</Link>
              <Link href="/login" className={linkCls}>Sign in</Link>
              <Link href="/safety" className={linkCls}>Safety &amp; prohibited items</Link>
            </div>
          </nav>

          <nav aria-label="About us" className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">About us</p>
            <div className="flex flex-col gap-1.5 text-sm">
              <Link href="/about" className={linkCls}>About lumo</Link>
              <Link href="/careers" className={linkCls}>We are hiring!</Link>
              <Link href="/terms" className={linkCls}>Terms &amp; Conditions</Link>
              <Link href="/privacy" className={linkCls}>Privacy Policy</Link>
              <Link href="/billing-policy" className={linkCls}>Billing Policy</Link>
              <Link href="/candidate-privacy" className={linkCls}>Candidate Privacy Policy</Link>
              <Link href="/cookie-policy" className={linkCls}>Cookie Policy</Link>
              <Link href="/copyright-policy" className={linkCls}>Copyright Infringement Policy</Link>
            </div>
          </nav>
        </div>

        {categories.length > 0 && (
          <div className="space-y-2 border-t border-slate-800 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Popular categories
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {categories.map((c) => (
                <Link key={c.id} href={`/category/${c.slug}`} className={linkCls}>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <details className="group border-t border-slate-800 pt-6">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-300">
            Browse by state
            <span className="text-base leading-none transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
            {NG_STATES.map((state) => (
              <Link key={state} href={`/listings/${toSlug(state)}`} className={linkCls}>
                {state}
              </Link>
            ))}
          </div>
        </details>

        <p className="border-t border-slate-800 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} {SITE_NAME} — the trusted local marketplace for verified Nigerian sellers.
        </p>
      </div>
    </footer>
  );
}
