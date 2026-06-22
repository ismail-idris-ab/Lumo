import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const TONE = {
  rose: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
  blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
} as const;

export type IconTone = keyof typeof TONE;

export function NavIconLink({
  href,
  label,
  icon: Icon,
  tone,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: IconTone;
  badge?: number;
}) {
  return (
    <Tooltip label={label}>
      <Link
        href={href}
        aria-label={label}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-full transition-colors',
          TONE[tone],
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
        {!!badge && badge > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </Link>
    </Tooltip>
  );
}
