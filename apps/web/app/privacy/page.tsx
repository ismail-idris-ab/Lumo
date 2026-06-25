import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE_NAME} collects, uses, and protects your data.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="25 June 2026"
      intro={
        <p>
          This explains what {SITE_NAME} collects about you, why, and what you can do about it.
        </p>
      }
    >
      <LegalSection heading="What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Account details: name, email, phone number, password (stored hashed, never in plain text).</li>
          <li>Listing data: anything you post — title, description, price, category, location, photos.</li>
          <li>Activity: messages sent through Lumo chat, favorites, saved searches, contact-reveal requests, and reports you file or are named in.</li>
          <li>Payment references: when you pay for a promotion, subscription, or verification, we store the transaction reference and status from Paystack — never your card number, which Paystack handles directly and never shares with us.</li>
          <li>Basic technical data: IP address and device info, used for rate-limiting, fraud prevention, and security logs.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          To run the marketplace: showing your listings to the right buyers, moderating content,
          revealing contact details when you choose to, sending you notifications about your
          listings and messages, and fulfilling payments once Paystack confirms them. We don&apos;t
          sell your data to advertisers.
        </p>
      </LegalSection>

      <LegalSection heading="Who we share it with">
        <p>
          Only the providers that make Lumo work: Paystack (payments), Cloudinary (photo storage),
          Resend (transactional email), and Meilisearch (search indexing of approved, public
          listing data). Each only receives what it needs to do its job.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          Listings are kept while active and for a period after expiry so you can renew them.
          Account data is kept while your account is active. If you delete your account, we remove
          personal data within a reasonable period, except where we&apos;re required to keep
          records (e.g. payment history) for legal or accounting reasons.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Under the Nigeria Data Protection Act, you can ask us what personal data we hold about
          you, ask us to correct it, or ask us to delete it (subject to the retention exceptions
          above). You can also delete your account yourself from{' '}
          <a href="/settings/delete" className="underline">
            account settings
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          For any data request, email{' '}
          <a href="mailto:ismailidris285@gmail.com" className="underline">
            ismailidris285@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
