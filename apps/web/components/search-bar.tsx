import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

// Plain GET form → works without JS (SSR-friendly).
export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/search" method="get" className="flex w-full max-w-xl gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Search phones, cars, property…"
        aria-label="Search listings"
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button type="submit" className={cn(buttonVariants())}>
        Search
      </button>
    </form>
  );
}
