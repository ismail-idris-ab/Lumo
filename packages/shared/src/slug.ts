// Slug helpers. Listing slugs: `lagos-iphone-13-pro-ab12cd` (city-title-shortid).

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildListingSlug(city: string, title: string, shortId: string): string {
  return [slugify(city), slugify(title), shortId.toLowerCase()].filter(Boolean).join('-');
}
