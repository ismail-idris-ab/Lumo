import { NG_STATES } from '@lumo/shared';

export function toSlug(state: string): string {
  return state.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Bidirectional map: slug → canonical state name. Shared between /listings/[state] and the
// /category/[slug]/[state] landing pages so both use the exact same slugify rule.
export const SLUG_TO_STATE: Record<string, string> = Object.fromEntries(
  NG_STATES.map((s) => [toSlug(s), s]),
);
