import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About us',
  description: `${SITE_NAME} is the trusted local marketplace for verified Nigerian sellers.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <LegalPage
      title="About Lumo"
      intro={
        <p>
          Lumo is a local marketplace built for Nigeria — a place to buy and sell phones, cars,
          property, and services with people in your own city, without the guesswork.
        </p>
      }
    >
      <LegalSection heading="Why we exist">
        <p>
          Classifieds in Nigeria run on trust, or the lack of it. Too many buyers have shown up to
          a meeting for an item that didn&apos;t exist, and too many honest sellers get lost in a
          flood of scam listings. Lumo is built to fix that: every listing goes through
          moderation, every seller can get Verified, and every conversation happens inside the app
          so there&apos;s a record if something goes wrong.
        </p>
      </LegalSection>

      <LegalSection heading="What Lumo is — and isn't">
        <p>
          Lumo is classifieds, not e-commerce. We connect buyers and sellers — we don&apos;t hold
          your money, ship your item, or stand between you and the other person at checkout.
          Sellers list, buyers reach out, and the deal happens directly between you. What we charge
          for is visibility and trust: promoting a listing, getting Verified, subscribing as a
          power seller — never a cut of your sale.
        </p>
      </LegalSection>

      <LegalSection heading="How we keep it local">
        <p>
          Search on Lumo is built around where you actually are — your state, your city. Browse
          by category and location together, and you&apos;ll find listings from people close
          enough to meet in person, which is still the safest way to trade.
        </p>
      </LegalSection>

      <LegalSection heading="Get in touch">
        <p>
          Questions, feedback, or a partnership idea? Reach us at{' '}
          <a href="mailto:ismailidris285@gmail.com" className="underline">
            ismailidris285@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
