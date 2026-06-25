'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const ACTION_LABELS: Record<string, string> = {
  'listing.approve': 'Approved',
  'listing.reject': 'Rejected',
  'listing.suspend': 'Suspended',
  'listing.request_changes': 'Changes requested',
  'listing.flag': 'Flagged',
  'listing.admin_delete': 'Deleted',
  'report.resolve': 'Reports resolved',
  'verification.approve': 'Verifications approved',
  'verification.reject': 'Verifications rejected',
};

interface ModeratorActivity {
  actorId: string;
  name: string;
  email: string;
  totalActions: number;
  byAction: Record<string, number>;
}

interface ModeratorActivityResponse {
  from: string;
  to: string;
  moderators: ModeratorActivity[];
}

export default function AdminStaffPage() {
  const [days, setDays] = useState<Range>(30);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-moderator-activity', days],
    queryFn: () => {
      const to = new Date();
      const from = new Date(to.getTime() - days * 86_400_000);
      return api.get<ModeratorActivityResponse>(
        `/admin/analytics/moderators?from=${from.toISOString()}&to=${to.toISOString()}`,
      );
    },
  });

  const moderators = data?.moderators ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff activity</h1>
          <p className="text-sm text-muted-foreground">
            What each moderator actually did — use this to pay by work done.
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Select time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              aria-pressed={r === days}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                r === days ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      ) : isError ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <p>Couldn&apos;t load staff activity.</p>
          <button type="button" onClick={() => refetch()} className="rounded-md border px-3 py-1 hover:bg-accent">
            Retry
          </button>
        </div>
      ) : moderators.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border text-sm text-muted-foreground">
          No moderation actions in the last {days} days.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Moderator</th>
                <th className="px-3 py-2 text-right">Total actions</th>
                <th className="px-3 py-2">Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {moderators.map((m) => (
                <tr key={m.actorId} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{m.totalActions}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {Object.entries(m.byAction)
                      .map(([action, count]) => `${ACTION_LABELS[action] ?? action}: ${count}`)
                      .join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
