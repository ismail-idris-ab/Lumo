'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

interface StaffApplicationDTO {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt: string | null;
}

export default function AdminApplicationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-applications', 'PENDING'],
    queryFn: () => api.get<{ applications: StaffApplicationDTO[] }>('/admin/applications?status=PENDING'),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-applications'] });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/applications/${id}/approve`),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/admin/applications/${id}/reject`),
    onSuccess: invalidate,
  });

  const applications = data?.applications ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-sm text-muted-foreground">
          People who want to join the team via &quot;We are hiring!&quot;. Approving tells them to
          register — you still grant the role yourself on the Staff page.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="text-muted-foreground">No pending applications.</p>
      ) : (
        <ul className="space-y-3">
          {applications.map((a) => (
            <li key={a.id} className="rounded-lg border p-3">
              <p className="font-medium">{a.name}</p>
              <p className="text-sm text-muted-foreground">{a.email}</p>
              {a.message && <p className="mt-2 text-sm">{a.message}</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(a.id)}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reject.isPending}
                  onClick={() => reject.mutate(a.id)}
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
