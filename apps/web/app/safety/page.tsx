import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Safety & prohibited items',
  description: `How to trade safely on ${SITE_NAME}, and the items not allowed on our marketplace.`,
  alternates: { canonical: '/safety' },
};

const PROHIBITED = [
  'Weapons, firearms, ammunition, and explosives',
  'Illegal drugs, prescription medication, and related paraphernalia',
  'Counterfeit, fake, or replica goods',
  'Stolen goods or items without proof of ownership',
  'Live animals classed as endangered or protected wildlife products',
  'Adult/sexual services and pornographic material',
  'Government-issued documents, IDs, and currency',
  'Hacked accounts, financial instruments, and personal data',
  'Hazardous, recalled, or unsafe products',
];

const SAFE_TIPS = [
  'Meet in a public, well-lit place during the day for in-person deals.',
  'Inspect the item fully before paying — test electronics and check serial numbers.',
  'Never pay in advance for goods you have not seen, and avoid wiring money to strangers.',
  'Be wary of deals that seem too good to be true or sellers rushing you to pay.',
  'Prefer Verified sellers, and keep your conversation inside Lumo chat for a record.',
  'Report listings that look like scams — it protects the whole community.',
];

export default function SafetyPage() {
  return (
    <main className="container max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Safety &amp; prohibited items</h1>
        <p className="text-muted-foreground">
          {SITE_NAME} is built on trust. These rules keep buyers and sellers safe. Listing a
          prohibited item or breaking these rules can lead to removal and a permanent ban.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Trade safely</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          {SAFE_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Prohibited items</h2>
        <p className="text-sm text-muted-foreground">
          The following may not be listed on {SITE_NAME}:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          {PROHIBITED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border bg-muted/40 p-4">
        <h2 className="text-base font-semibold">See something wrong?</h2>
        <p className="text-sm text-muted-foreground">
          Use the “Report this listing” link on any listing to flag scams or prohibited items. Our
          moderation team reviews every report.
        </p>
      </section>
    </main>
  );
}
