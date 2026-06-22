'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';

export default function DeleteAccountPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.delete('/me', { currentPassword });
      await logout();
      router.push('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete account. Try again.');
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Delete account</h1>
        <p className="text-sm text-slate-500">This permanently deactivates your account.</p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          This cannot be undone. Your listings will stop showing and you won&apos;t be able to log
          back in with this account.
        </span>
      </div>

      <form onSubmit={onDelete} className="space-y-4">
        <Field label="Current password">
          <FieldInput
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </Field>

        {error && <FormError message={error} />}

        <Button type="submit" variant="destructive" disabled={busy}>
          {busy ? 'Deleting…' : 'Delete my account permanently'}
        </Button>
      </form>
    </div>
  );
}
