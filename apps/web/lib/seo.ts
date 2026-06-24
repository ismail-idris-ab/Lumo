import type { PublicListing } from '@lumo/shared';

export const SITE_NAME = 'Lumo';
export const SITE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? 'http://localhost:3000';
export const SITE_DESCRIPTION = 'The trusted local marketplace for verified Nigerian sellers.';

export function escapeXml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}

// JSON-LD builders (TRD §24). Conditions mapped to schema.org enums.
const CONDITION_SCHEMA: Record<string, string> = {
  NEW: 'https://schema.org/NewCondition',
  USED: 'https://schema.org/UsedCondition',
  FOR_PARTS: 'https://schema.org/DamagedCondition',
};

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}

export function productJsonLd(listing: PublicListing) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    image: listing.images.map((i) => i.url),
    category: listing.category?.name,
    itemCondition: CONDITION_SCHEMA[listing.condition],
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: (listing.priceKobo / 100).toFixed(2),
      availability:
        listing.status === 'APPROVED'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/listing/${listing.slug}`,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.url}`,
    })),
  };
}

export function itemListJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: `${SITE_URL}${it.url}`,
    })),
  };
}

// Inline JSON-LD <script> props (used with dangerouslySetInnerHTML).
export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data) };
}
