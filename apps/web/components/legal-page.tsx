import type { ReactNode } from 'react';

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated?: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="container max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        {updated && <p className="text-xs text-muted-foreground">Last updated: {updated}</p>}
        <div className="text-muted-foreground">{intro}</div>
      </header>
      <div className="space-y-8">{children}</div>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{heading}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
