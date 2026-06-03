'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

interface VReq {
  id: string;
  user: { id: string; name: string; email: string };
  businessName: string | null;
  status: string;
  createdAt: string;
  docs: { type: string; viewUrl: string }[];
}

export default function AdminVerificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: () => api.get<{ requests: VReq[] }>('/admin/verifications?status=PENDING'),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-verifications'] });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/verifications/${id}/approve`),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/verifications/${id}/reject`, { reason }),
    onSuccess: invalidate,
  });

  const requests = data?.requests ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Verification requests</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground">No pending requests.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded-lg border p-3">
              <p className="font-medium">{r.businessName || r.user.name}</p>
              <p className="text-sm text-muted-foreground">{r.user.email}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-sm">
                {r.docs.map((d, i) => (
                  <a key={i} href={d.viewUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                    {d.type} doc {i + 1}
                  </a>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(r.id)}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reject.isPending}
                  onClick={() => {
                    const reason = prompt('Rejection reason?');
                    if (reason) reject.mutate({ id: r.id, reason });
                  }}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
