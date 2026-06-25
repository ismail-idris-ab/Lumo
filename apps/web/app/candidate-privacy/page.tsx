import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Candidate Privacy Policy',
  description: `How ${SITE_NAME} handles job applicant data.`,
  alternates: { canonical: '/candidate-privacy' },
};

export default function CandidatePrivacyPage() {
  return (
    <LegalPage
      title="Candidate Privacy Policy"
      updated="25 June 2026"
      intro={
        <p>
          This covers anyone who reaches out about working at {SITE_NAME} — see{' '}
          <a href="/careers" className="underline">
            Careers
          </a>
          . We don&apos;t currently run a formal hiring pipeline; this policy describes how we
          handle anything you send us in the meantime.
        </p>
      }
    >
      <LegalSection heading="What we collect">
        <p>
          If you email us about a role, we keep whatever you send — typically your name, contact
          details, CV, and any cover note. We don&apos;t request anything beyond that, and we
          don&apos;t run background checks or collect data from third parties about candidates.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          Solely to consider you for a role at Lumo, now or when one opens up. We don&apos;t share
          candidate information outside the small team making hiring decisions, and we never use
          it for marketing.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          We keep candidate information on file for up to 12 months in case a relevant role opens,
          then delete it. You can ask us to delete it sooner at any time.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can ask what we hold about you, ask us to correct it, or ask us to delete it, at any
          time, with no effect on any future application.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Email{' '}
          <a href="mailto:ismailidris285@gmail.com" className="underline">
            ismailidris285@gmail.com
          </a>{' '}
          for anything candidate-data related.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
