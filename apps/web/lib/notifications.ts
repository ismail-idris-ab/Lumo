import type { NotificationDTO } from '@lumo/shared';

interface Formatted {
  title: string;
  href: string | null;
}

// Renders a stored notification's free-form `payload` JSON into a readable
// title + click target. One entry per `notify()` call site in the API.
export function formatNotification({ type, payload }: NotificationDTO): Formatted {
  const p = (payload ?? {}) as Record<string, unknown>;
  const slug = typeof p.slug === 'string' ? p.slug : typeof p.listingSlug === 'string' ? p.listingSlug : null;
  const title = typeof p.title === 'string' ? p.title : typeof p.listingTitle === 'string' ? p.listingTitle : null;

  switch (type) {
    case 'listing.approved':
      return { title: `Your listing "${title ?? 'listing'}" was approved`, href: slug ? `/listing/${slug}` : '/dashboard/listings' };
    case 'listing.rejected':
      return { title: `Your listing "${title ?? 'listing'}" was rejected`, href: '/dashboard/listings' };
    case 'listing.suspended':
      return { title: `Your listing "${title ?? 'listing'}" was suspended`, href: '/dashboard/listings' };
    case 'listing.changes_requested':
      return { title: `Changes requested on "${title ?? 'your listing'}"`, href: '/dashboard/listings' };
    case 'listing.deleted_by_admin':
      return { title: 'A listing of yours was removed by an admin', href: '/dashboard/listings' };
    case 'listing.expired':
      return { title: `Your listing "${title ?? 'listing'}" has expired`, href: slug ? `/listing/${slug}` : '/dashboard/listings' };
    case 'listing.freshness_nudge':
      return { title: `Still selling "${title ?? 'your listing'}"? Give it a refresh`, href: '/dashboard/listings' };
    case 'PRICE_DROP':
      return { title: `Price dropped on "${title ?? 'a listing'}" you're watching`, href: slug ? `/listing/${slug}` : null };
    case 'SAVED_SEARCH_MATCH':
      return { title: `New match for "${typeof p.savedSearchName === 'string' ? p.savedSearchName : 'your saved search'}"`, href: slug ? `/listing/${slug}` : '/dashboard/saved-searches' };
    case 'payment.success':
      return { title: 'Payment successful', href: '/dashboard/payments' };
    case 'verification.approved':
      return { title: "You're verified! Your badge is now live", href: '/settings' };
    case 'verification.rejected':
      return { title: 'Your verification request was rejected', href: '/settings' };
    default:
      return { title: type.replace(/[._]/g, ' '), href: null };
  }
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}
