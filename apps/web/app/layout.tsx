import type { Metadata } from 'next';
import './globals.css';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, jsonLdScript, organizationJsonLd } from '@/lib/seo';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — trusted local marketplace`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, type: 'website', locale: 'en_NG' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())}
        />
        <Providers>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <footer className="border-t py-6">
            <div className="container flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
              <nav className="flex gap-4">
                <a href="/safety" className="hover:underline">
                  Safety &amp; prohibited items
                </a>
              </nav>
              <p>
                © {new Date().getFullYear()} {SITE_NAME} — {SITE_DESCRIPTION}
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
