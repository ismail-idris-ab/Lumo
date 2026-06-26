import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { StaffApplicationForm } from '@/components/staff-application-form';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'We are hiring!',
  description: `Careers at ${SITE_NAME}.`,
  alternates: { canonical: '/careers' },
};

export default function CareersPage() {
  return (
    <LegalPage
      title="We are hiring!"
      intro={<p>We&apos;re building Lumo lean right now — but we&apos;re growing.</p>}
    >
      <LegalSection heading="No open roles right now">
        <p>
          We don&apos;t have a formal job posting open at this moment. When we do, roles will be
          listed on this page first.
        </p>
      </LegalSection>

      <LegalSection heading="What we look for, eventually">
        <p>
          People who care about trust and craft — engineers who sweat the small details of a
          listing flow, people who understand the Nigerian market and what it takes to make
          buying and selling feel safe.
        </p>
      </LegalSection>

      <LegalSection heading="Apply">
        <p className="mb-3">
          Think you&apos;d be a great fit for what we&apos;re building? Tell us below — we keep good
          people on file for when a role opens. See our{' '}
          <a href="/candidate-privacy" className="underline">
            Candidate Privacy Policy
          </a>{' '}
          for how we handle anything you send us.
        </p>
        <StaffApplicationForm />
      </LegalSection>
    </LegalPage>
  );
}
