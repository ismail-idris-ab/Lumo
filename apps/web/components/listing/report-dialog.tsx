'use client';

import { useState } from 'react';
import { createReportSchema, reportReasonValues, type ReportReason } from '@lumo/shared';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Field, FieldTextarea, inputClassName } from '@/components/ui/field';

const REASON_LABEL: Record<ReportReason, string> = {
  SCAM: 'Scam or fraud',
  PROHIBITED: 'Prohibited item',
  DUPLICATE: 'Duplicate listing',
  MISCATEGORISED: 'Wrong category',
  ALREADY_SOLD: 'Already sold',
  OTHER: 'Other',
};

export function ReportDialog({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>('SCAM');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    const parsed = createReportSchema.safeParse({
      listingId,
      reason,
      details: details.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid report');
      return;
    }
    setBusy(true);
    try {
      await api.post('/reports', parsed.data);
      setDone(true);
    } catch (e) {
      // 409/dedupe still means "we have it" — treat as success.
      if (e instanceof ApiError && e.status === 409) setDone(true);
      else setError(e instanceof ApiError ? e.message : 'Could not submit report');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-lg bg-background p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="space-y-3 text-center">
            <p className="text-lg font-semibold">Thanks for reporting</p>
            <p className="text-sm text-muted-foreground">Our team will review this listing.</p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Report this listing</h2>
              <p className="text-sm text-muted-foreground">Tell us what&apos;s wrong with it.</p>
            </div>

            <Field label="Reason">
              <select
                className={inputClassName}
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
              >
                {reportReasonValues.map((r) => (
                  <option key={r} value={r}>
                    {REASON_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Details (optional)">
              <FieldTextarea
                value={details}
                maxLength={500}
                placeholder="Add anything that helps us review faster."
                onChange={(e) => setDetails(e.target.value)}
              />
            </Field>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={submit} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit report'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
