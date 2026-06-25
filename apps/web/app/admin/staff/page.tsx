'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

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

interface StaffMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

function ManageStaff() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const { data: list } = useQuery({
    queryKey: ['admin-staff-list'],
    queryFn: () => api.get<{ staff: StaffMember[] }>('/admin/staff'),
  });

  const search = useMutation({
    mutationFn: (value: string) => api.get<{ user: StaffMember | null }>(`/admin/staff/search?email=${encodeURIComponent(value)}`),
    onSuccess: (res) => {
      if (!res?.user) setSearchError('No account with that email — they need to register first.');
      else setSearchError(null);
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-staff-list'] });
    void search.mutate(email);
  };

  const grant = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.post(`/admin/staff/${id}/grant`, { role }),
    onSuccess: invalidate,
  });
  const revoke = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.post(`/admin/staff/${id}/revoke`, { role }),
    onSuccess: invalidate,
    onError: (err) => setSearchError(err instanceof ApiError ? err.message : 'Could not revoke role.'),
  });

  const found = search.data?.user;
  const staff = list?.staff ?? [];

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="text-lg font-semibold">Manage staff</h2>
        <p className="text-sm text-muted-foreground">
          Promote a registered user to a moderator role, or remove one.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearchError(null);
          search.mutate(email);
        }}
        className="flex gap-2"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@example.com"
          className="w-full max-w-xs rounded-md border px-3 py-1.5 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={search.isPending}>
          Find
        </Button>
      </form>

      {searchError && <p className="text-sm text-destructive">{searchError}</p>}

      {found && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
          <div className="min-w-0">
            <div className="font-medium">{found.name}</div>
            <div className="text-xs text-muted-foreground">{found.email}</div>
          </div>
          <div className="ml-auto flex gap-2">
            {STAFF_ROLES.map((role) =>
              found.roles.includes(role) ? (
                <Button
                  key={role}
                  size="sm"
                  variant="outline"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate({ id: found.id, role })}
                >
                  Revoke {role}
                </Button>
              ) : (
                <Button
                  key={role}
                  size="sm"
                  disabled={grant.isPending}
                  onClick={() => grant.mutate({ id: found.id, role })}
                >
                  Grant {role}
                </Button>
              ),
            )}
          </div>
        </div>
      )}

      {staff.length > 0 && (
        <ul className="divide-y rounded-md border text-sm">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.email}</div>
              </div>
              <div className="flex gap-1.5">
                {s.roles.filter((r) => STAFF_ROLES.includes(r as (typeof STAFF_ROLES)[number])).map((r) => (
                  <span key={r} className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
                    {r}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminStaffPage() {
  const { user } = useAuth();
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
      {user?.roles.includes('SUPER_ADMIN') && <ManageStaff />}

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
