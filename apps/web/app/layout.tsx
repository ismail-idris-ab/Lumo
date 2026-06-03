import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, jsonLdScript, organizationJsonLd } from '@/lib/seo';

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
        <header className="border-b">
          <div className="container flex h-14 items-center justify-between gap-4">
            <Link href="/" className="text-lg font-bold">
              {SITE_NAME}
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/search" className="text-muted-foreground hover:text-foreground">
                Browse
              </Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Log in
              </Link>
              <Link href="/dashboard" className="font-medium text-primary">
                Sell
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t py-6">
          <div className="container text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {SITE_NAME} — {SITE_DESCRIPTION}
          </div>
        </footer>
      </body>
    </html>
  );
}
