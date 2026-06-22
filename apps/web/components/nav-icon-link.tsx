import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

export function NavIconLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Tooltip label={label}>
      <Link
        href={href}
        aria-label={label}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Icon className="h-[18px] w-[18px]" />
      </Link>
    </Tooltip>
  );
}
