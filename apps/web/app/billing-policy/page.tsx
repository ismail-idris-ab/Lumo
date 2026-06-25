import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Billing Policy',
  description: `How payments, promotions, and subscriptions are billed on ${SITE_NAME}.`,
  alternates: { canonical: '/billing-policy' },
};

export default function BillingPolicyPage() {
  return (
    <LegalPage
      title="Billing Policy"
      updated="25 June 2026"
      intro={
        <p>
          {SITE_NAME} never charges you to buy or sell on the marketplace itself. This policy
          covers the paid features that do exist: promotions, featured placement, seller
          subscriptions, and seller verification.
        </p>
      }
    >
      <LegalSection heading="How payment works">
        <p>
          All payments are processed by Paystack — we never see or store your card details. Prices
          are shown in Naira. A paid feature is only activated after Paystack confirms the payment
          succeeded; we never manually credit a feature on the strength of a screenshot or a
          callback from your browser alone.
        </p>
      </LegalSection>

      <LegalSection heading="What you're paying for">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Promotions:</strong> a listing is boosted in search/category results until its promotion period ends, then it reverts to normal automatically.</li>
          <li><strong>Featured placement:</strong> similar to promotions, applied at the store level, auto-reverts on expiry.</li>
          <li><strong>Subscriptions:</strong> recurring access to seller-tier features for the period you paid for.</li>
          <li><strong>Verification fee:</strong> covers the review of your seller verification submission.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Refunds">
        <p>
          Because these are visibility and trust features rather than physical goods, payments are
          non-refundable once the feature has been fulfilled (i.e. your listing is promoted, your
          subscription is active, or your verification has been reviewed). If a payment was taken
          but the feature was never activated due to an error on our side, contact us and
          we&apos;ll fix it or refund it.
        </p>
      </LegalSection>

      <LegalSection heading="Failed or reversed payments">
        <p>
          If Paystack reports a payment as failed or reversed after it briefly appeared successful,
          the corresponding feature will not be (or will stop being) active. We reconcile pending
          payments automatically and only act on a verified Paystack confirmation, never a client
          callback.
        </p>
      </LegalSection>

      <LegalSection heading="Disputes">
        <p>
          See your payment history under{' '}
          <a href="/dashboard/payments" className="underline">
            Dashboard → Payments
          </a>
          . For anything that looks wrong, email{' '}
          <a href="mailto:ismailidris285@gmail.com" className="underline">
            ismailidris285@gmail.com
          </a>{' '}
          with your transaction reference.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
