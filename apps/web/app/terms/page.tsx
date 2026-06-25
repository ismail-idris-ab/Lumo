import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: `The terms that govern your use of ${SITE_NAME}.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="25 June 2026"
      intro={
        <p>
          These terms govern your use of {SITE_NAME}. By creating an account, posting a listing,
          or messaging another user, you agree to them.
        </p>
      }
    >
      <LegalSection heading="1. What Lumo is">
        <p>
          Lumo is a classifieds platform, not an online store. We provide the space for sellers to
          list items or services and for buyers to discover and contact them. We are not a party
          to any sale — there is no buyer checkout on Lumo, and we never take payment for, ship, or
          guarantee any item listed by a user. Any agreement to buy or sell is strictly between the
          buyer and the seller.
        </p>
      </LegalSection>

      <LegalSection heading="2. Who can use Lumo">
        <p>
          You must be at least 18 years old and able to form a binding contract under Nigerian law
          to create an account. You&apos;re responsible for keeping your login credentials secure
          and for everything that happens under your account.
        </p>
      </LegalSection>

      <LegalSection heading="3. Listings and moderation">
        <p>
          Every new or edited listing is reviewed before it appears publicly. We may approve,
          reject, request changes to, suspend, flag, or remove any listing at our discretion,
          including for breaching our{' '}
          <a href="/safety" className="underline">
            Safety &amp; prohibited items
          </a>{' '}
          rules. Listings expire automatically after a fixed period and can be renewed. You confirm
          that anything you list is yours to sell, legal to sell, and accurately described.
        </p>
      </LegalSection>

      <LegalSection heading="4. Contact and messaging">
        <p>
          Contact details are only revealed to logged-in users, and we rate-limit how often a
          phone number can be revealed to deter scraping and abuse. Messages sent through Lumo chat
          may be reviewed if reported as part of a safety investigation.
        </p>
      </LegalSection>

      <LegalSection heading="5. Payments">
        <p>
          Paid features — promoting a listing, featured placement, seller subscriptions, and
          seller verification — are processed through Paystack. Prices are shown in Naira. A paid
          feature is only activated once Paystack confirms the payment; see our{' '}
          <a href="/billing-policy" className="underline">
            Billing Policy
          </a>{' '}
          for details on fulfilment and refunds. These fees pay for visibility and trust signals,
          never for the item itself.
        </p>
      </LegalSection>

      <LegalSection heading="6. Account suspension">
        <p>
          We may suspend or terminate an account that violates these terms, posts prohibited
          items, is reported and found to be fraudulent, or abuses the platform (including scraping,
          spam, or harassment of other users). We keep an audit trail of moderation actions taken
          against an account.
        </p>
      </LegalSection>

      <LegalSection heading="7. Liability">
        <p>
          Lumo is provided &quot;as is.&quot; We do our best to verify sellers and moderate
          listings, but we cannot guarantee the identity, intentions, or honesty of any user. We
          are not liable for losses arising from a transaction between users — see our{' '}
          <a href="/safety" className="underline">
            safety guidance
          </a>{' '}
          for how to trade safely.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to these terms">
        <p>
          We may update these terms as Lumo grows. We&apos;ll update the date at the top of this
          page when we do; continued use of Lumo after a change means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection heading="9. Governing law">
        <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          Reach us at{' '}
          <a href="mailto:ismailidris285@gmail.com" className="underline">
            ismailidris285@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
