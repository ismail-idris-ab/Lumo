'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

interface ReportGroup {
  listing: { id: string; slug: string; title: string; status: string };
  reportCount: number;
  reports: { id: string; reason: string; details: string | null }[];
}

export default function AdminReportsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => api.get<{ groups: ReportGroup[] }>('/admin/reports'),
  });
  const resolve = useMutation({
    mutationFn: (body: { listingId: string; action: string; reason?: string }) =>
      api.post('/admin/reports/resolve', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const groups = data?.groups ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reported listings</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground">No unresolved reports.</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.listing.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{g.listing.title}</p>
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">
                  {g.reportCount} report{g.reportCount === 1 ? '' : 's'}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {g.reports.map((r) => r.reason).join(', ')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" disabled={resolve.isPending} onClick={() => resolve.mutate({ listingId: g.listing.id, action: 'none' })}>
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolve.isPending}
                  onClick={() => {
                    const reason = prompt('Suspend reason?');
                    if (reason) resolve.mutate({ listingId: g.listing.id, action: 'suspend', reason });
                  }}
                >
                  Suspend
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={resolve.isPending}
                  onClick={() => {
                    const reason = prompt('Delete reason?');
                    if (reason) resolve.mutate({ listingId: g.listing.id, action: 'delete', reason });
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
