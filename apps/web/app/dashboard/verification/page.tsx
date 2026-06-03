'use client';

import { useState } from 'react';
import {
  applyVerificationSchema,
  verificationDocTypeValues,
  type VerificationDoc,
} from '@lumo/shared';
import { api, ApiError } from '@/lib/api-client';
import { uploadVerificationDoc } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, inputClassName } from '@/components/ui/field';

const DOC_TYPE_LABEL: Record<(typeof verificationDocTypeValues)[number], string> = {
  ID: 'Government ID',
  BUSINESS: 'Business document',
  OTHER: 'Other',
};

type DocType = (typeof verificationDocTypeValues)[number];

export default function VerificationPage() {
  const [businessName, setBusinessName] = useState('');
  const [docType, setDocType] = useState<DocType>('ID');
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (docs.length >= 5) {
      setError('You can attach up to 5 documents.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const { url, publicId } = await uploadVerificationDoc(file);
      setDocs((d) => [...d, { url, publicId, type: docType }]);
    } catch {
      setError('Upload failed. Use a clear photo or PDF under the size limit.');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    const parsed = applyVerificationSchema.safeParse({
      businessName: businessName.trim() || undefined,
      docs,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid submission');
      return;
    }
    setBusy(true);
    try {
      await api.post('/verification/apply', parsed.data);
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError('You already have a pending verification request.');
      } else {
        setError(e instanceof ApiError ? e.message : 'Could not submit');
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Verification submitted</h1>
        <p className="text-muted-foreground">
          Your documents are under review. We&apos;ll notify you once a decision is made.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Get verified</h1>
        <p className="text-sm text-muted-foreground">
          Verified sellers earn buyer trust and a badge. Upload your ID (and a business document if
          you sell as a business). Documents are stored privately and only seen by our review team.
        </p>
      </div>

      <Field label="Business name (optional)">
        <FieldInput
          value={businessName}
          maxLength={120}
          placeholder="e.g. Bright Electronics"
          onChange={(e) => setBusinessName(e.target.value)}
        />
      </Field>

      <div className="space-y-3">
        <Field label="Add a document">
          <div className="flex gap-2">
            <select
              className={inputClassName}
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
            >
              {verificationDocTypeValues.map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <label className="inline-flex shrink-0 cursor-pointer items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent">
              {uploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                disabled={uploading || docs.length >= 5}
                onChange={onFile}
              />
            </label>
          </div>
        </Field>

        {docs.length > 0 && (
          <ul className="space-y-2">
            {docs.map((d, i) => (
              <li
                key={d.publicId}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {DOC_TYPE_LABEL[d.type as DocType]} · document {i + 1}
                </span>
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => setDocs((list) => list.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={submit} disabled={busy || uploading || docs.length === 0}>
        {busy ? 'Submitting…' : 'Submit for review'}
      </Button>
    </div>
  );
}
