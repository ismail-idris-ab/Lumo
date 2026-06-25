import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: `How ${SITE_NAME} uses cookies.`,
  alternates: { canonical: '/cookie-policy' },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="25 June 2026"
      intro={<p>{SITE_NAME} keeps cookies to a minimum — just what&apos;s needed to keep you signed in.</p>}
    >
      <LegalSection heading="What we use cookies for">
        <p>
          We set a single essential cookie: a secure, httpOnly refresh token that keeps you logged
          in between visits. It can&apos;t be read by JavaScript and is only sent back to our own
          servers. We don&apos;t use it to track you across other sites.
        </p>
      </LegalSection>

      <LegalSection heading="What we don't do">
        <p>
          We don&apos;t use third-party advertising cookies, and we don&apos;t sell or share
          browsing data with ad networks. If we add aggregated, privacy-respecting analytics in
          the future, we&apos;ll update this page first.
        </p>
      </LegalSection>

      <LegalSection heading="Controlling cookies">
        <p>
          You can clear cookies at any time from your browser settings — doing so will simply log
          you out of Lumo, and you can sign back in.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions? Email{' '}
          <a href="mailto:ismailidris285@gmail.com" className="underline">
            ismailidris285@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
