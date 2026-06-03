'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ReportDialog } from '@/components/listing/report-dialog';

function waLink(phone: string) {
  const intl = phone.startsWith('0') ? `234${phone.slice(1)}` : phone.replace(/^\+/, '');
  return `https://wa.me/${intl}`;
}

export function ListingActions({
  listingId,
  slug,
  sellerId,
}: {
  listingId: string;
  slug: string;
  sellerId: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  const loginGate = () => router.push(`/login?next=/listing/${slug}`);
  const isOwner = user?.id === sellerId;

  if (isOwner) {
    return <p className="text-sm text-muted-foreground">This is your listing.</p>;
  }

  async function reveal() {
    if (!user) return loginGate();
    setError(null);
    setBusy('phone');
    try {
      const res = await api.post<{ phone: string | null }>(`/listings/${listingId}/contact-reveal`);
      setPhone(res.phone ?? 'No phone provided');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reveal contact');
    } finally {
      setBusy(null);
    }
  }

  async function toggleSave() {
    if (!user) return loginGate();
    setBusy('save');
    try {
      if (saved) {
        await api.delete(`/favorites/${listingId}`);
        setSaved(false);
      } else {
        await api.post(`/favorites/${listingId}`);
        setSaved(true);
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  async function startChat() {
    if (!user) return loginGate();
    setBusy('chat');
    try {
      await api.post('/chats', { listingId });
      router.push('/dashboard/messages');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start chat');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {phone ? (
          <>
            <a href={`tel:${phone}`} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
              Call {phone}
            </a>
            {/^[0+]/.test(phone) && (
              <a
                href={waLink(phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border px-5 py-2 text-sm font-medium"
              >
                WhatsApp
              </a>
            )}
          </>
        ) : (
          <Button onClick={reveal} disabled={busy === 'phone'}>
            {busy === 'phone' ? 'Revealing…' : 'Show phone'}
          </Button>
        )}
        <Button variant="outline" onClick={startChat} disabled={busy === 'chat'}>
          Chat
        </Button>
        <Button variant="ghost" onClick={toggleSave} disabled={busy === 'save'}>
          {saved ? '♥ Saved' : '♡ Save'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={() => (user ? setReporting(true) : loginGate())}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        Report this listing
      </button>
      {reporting && <ReportDialog listingId={listingId} onClose={() => setReporting(false)} />}
    </div>
  );
}
