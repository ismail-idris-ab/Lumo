'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';

export default function ChangeEmailPage() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch('/me/email', { currentPassword, newEmail });
      await refreshUser();
      setCurrentPassword('');
      setNewEmail('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change email. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Change email</h1>
        <p className="text-sm text-slate-500">
          Current email: <span className="font-medium text-slate-700">{user?.email}</span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Current password">
          <FieldInput
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="New email">
          <FieldInput
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
        </Field>

        {error && <FormError message={error} />}
        {success && <p className="text-sm font-medium text-emerald-700">Email updated!</p>}

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Update email'}
        </Button>
      </form>
    </div>
  );
}
