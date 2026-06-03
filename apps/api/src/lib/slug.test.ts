import { describe, it, expect } from 'vitest';
import { slugify, buildListingSlug } from '@lumo/shared';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('iPhone 13 Pro')).toBe('iphone-13-pro');
  });
  it('strips punctuation and collapses whitespace/dashes', () => {
    expect(slugify('  Clean!!  Sofa set -- 2024  ')).toBe('clean-sofa-set-2024');
  });
  it('removes underscores entirely (stripped before separator-collapse)', () => {
    // Quirk: the `_` in the collapse regex is a no-op because punctuation is removed first.
    expect(slugify('Sofa__set')).toBe('sofaset');
  });
  it('drops accents/diacritics', () => {
    expect(slugify('Café Olé')).toBe('cafe-ole');
  });
  it('returns empty string for symbol-only input', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('buildListingSlug', () => {
  it('joins city, title and shortid (lowercased)', () => {
    expect(buildListingSlug('Lagos', 'iPhone 13 Pro', 'AB12CD')).toBe('lagos-iphone-13-pro-ab12cd');
  });
  it('omits empty city/title segments', () => {
    expect(buildListingSlug('', 'Sofa', 'x1')).toBe('sofa-x1');
  });
});
