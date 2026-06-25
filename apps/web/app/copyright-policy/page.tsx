import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Copyright Infringement Policy',
  description: `How to report copyright infringement on ${SITE_NAME}.`,
  alternates: { canonical: '/copyright-policy' },
};

export default function CopyrightPolicyPage() {
  return (
    <LegalPage
      title="Copyright Infringement Policy"
      updated="25 June 2026"
      intro={
        <p>
          {SITE_NAME} respects intellectual property rights and expects sellers to only post
          photos and content they own or have permission to use.
        </p>
      }
    >
      <LegalSection heading="Filing a takedown notice">
        <p>
          If you believe a listing on Lumo uses your copyrighted photos, text, or other content
          without permission, email{' '}
          <a href="mailto:ismailidris285@gmail.com" className="underline">
            ismailidris285@gmail.com
          </a>{' '}
          with:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>A link to the listing in question.</li>
          <li>A description of the copyrighted work and proof you own it (or are authorized to act for the owner).</li>
          <li>Your contact details and a statement that you believe the use is unauthorized.</li>
        </ul>
        <p>
          You can also use the &quot;Report this listing&quot; option directly on the listing,
          which routes straight into our moderation queue.
        </p>
      </LegalSection>

      <LegalSection heading="What happens next">
        <p>
          We review every report. If a listing is found to infringe, we remove it and notify the
          seller. Sellers found to repeatedly post infringing content have their account suspended,
          following the same moderation and audit-log process used for any other policy violation.
        </p>
      </LegalSection>

      <LegalSection heading="Counter-notice">
        <p>
          If your listing was removed and you believe that was a mistake, reply to our notification
          email or write to{' '}
          <a href="mailto:ismailidris285@gmail.com" className="underline">
            ismailidris285@gmail.com
          </a>{' '}
          explaining why you have the rights to the content. We&apos;ll review and reinstate the
          listing if the claim was unfounded.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
