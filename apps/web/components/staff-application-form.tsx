'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export function StaffApplicationForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => api.post('/staff-applications', { name, email, message: message || undefined }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not send your application.'),
  });

  if (submit.isSuccess) {
    return (
      <p className="rounded-lg border bg-muted/30 p-4 text-sm">
        Thanks — we&apos;ve got your application. We&apos;ll reach out at {email} if it&apos;s a fit.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        submit.mutate();
      }}
      className="space-y-3 rounded-lg border p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-md border px-3 py-1.5 text-sm"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-md border px-3 py-1.5 text-sm"
        />
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What would you like to do at Lumo? (optional)"
        rows={3}
        className="w-full rounded-md border px-3 py-1.5 text-sm"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={submit.isPending}>
        Send application
      </Button>
    </form>
  );
}
