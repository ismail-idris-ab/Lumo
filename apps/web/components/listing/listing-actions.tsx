'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { ReportDialog } from '@/components/listing/report-dialog';
import type { PriceWatchDTO } from '@lumo/shared';

const QUICK_MESSAGES = ['Is this still available?', 'Please call me', "What's the last price?"];

function waLink(phone: string) {
  const intl = phone.startsWith('0') ? `234${phone.slice(1)}` : phone.replace(/^\+/, '');
  return `https://wa.me/${intl}`;
}

function copyToClipboard(text: string, onCopied: () => void) {
  navigator.clipboard.writeText(text).then(onCopied).catch(() => {});
}

function PhoneRow({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
      <span className="text-slate-400">📞</span>
      <span className="flex-1 font-medium text-slate-800">{phone}</span>
      <button
        type="button"
        onClick={() => copyToClipboard(phone, () => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        className="rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      {/^[0+]/.test(phone) && (
        <a
          href={waLink(phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100"
        >
          WA
        </a>
      )}
    </div>
  );
}

export function ListingActions({
  listingId,
  slug,
  sellerId,
  createdAt,
}: {
  listingId: string;
  slug: string;
  sellerId: string;
  createdAt?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [watching, setWatching] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [soldLoading, setSoldLoading] = useState(false);
  const [markedSold, setMarkedSold] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<PriceWatchDTO>(`/listings/${listingId}/watch`)
      .then((d) => setWatching(d.watching))
      .catch(() => {});
  }, [user, listingId]);

  const loginGate = () => router.push(`/login?next=/listing/${slug}`);
  const isOwner = user?.id === sellerId;

  if (isOwner) {
    const ageDays = createdAt
      ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
      : 0;

    async function markSold() {
      setSoldLoading(true);
      try {
        await api.post(`/listings/${listingId}/sold`);
        setMarkedSold(true);
      } catch { /* ignore */ } finally {
        setSoldLoading(false);
      }
    }

    if (markedSold) {
      return (
        <p className="text-sm font-medium text-blue-700">Marked as sold. Listing removed from public view.</p>
      );
    }

    return (
      <div className="space-y-2">
        {ageDays >= 20 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            This listing is {ageDays} days old. Already sold?{' '}
            <button
              type="button"
              onClick={markSold}
              disabled={soldLoading}
              className="font-semibold underline disabled:opacity-50"
            >
              {soldLoading ? 'Updating…' : 'Mark as sold'}
            </button>
          </div>
        )}
        <p className="text-sm text-muted-foreground">This is your listing.</p>
      </div>
    );
  }

  async function revealPhone() {
    if (!user) return loginGate();
    setPhoneLoading(true);
    setPhoneError(null);
    try {
      const res = await api.post<{ phone: string | null }>(`/listings/${listingId}/contact-reveal`);
      setPhone(res.phone ?? 'No phone provided');
    } catch (e) {
      setPhoneError(e instanceof ApiError ? e.message : 'Could not reveal contact');
    } finally {
      setPhoneLoading(false);
    }
  }

  async function quickSend(body: string) {
    if (!user) return loginGate();
    setSending(true);
    setChatError(null);
    try {
      let id = chatId;
      if (!id) {
        const res = await api.post<{ chat: { id: string } }>('/chats', { listingId });
        id = res.chat.id;
        setChatId(id);
      }
      await api.post(`/chats/${id}/messages`, { body });
      setSent(true);
    } catch (e) {
      setChatError(e instanceof ApiError ? e.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  async function sendMessage() {
    if (!user) return loginGate();
    if (!message.trim()) return;
    setSending(true);
    setChatError(null);
    try {
      let id = chatId;
      if (!id) {
        const res = await api.post<{ chat: { id: string } }>('/chats', { listingId });
        id = res.chat.id;
        setChatId(id);
      }
      await api.post(`/chats/${id}/messages`, { body: message.trim() });
      setSent(true);
    } catch (e) {
      setChatError(e instanceof ApiError ? e.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  async function toggleSave() {
    if (!user) return loginGate();
    setSaveLoading(true);
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
      setSaveLoading(false);
    }
  }

  async function toggleWatch() {
    if (!user) return loginGate();
    setWatchLoading(true);
    try {
      if (watching) {
        await api.delete(`/listings/${listingId}/watch`);
        setWatching(false);
      } else {
        await api.post(`/listings/${listingId}/watch`);
        setWatching(true);
      }
    } catch {
      /* ignore */
    } finally {
      setWatchLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Show contact */}
      {phone ? (
        <div className="space-y-2">
          <PhoneRow phone={phone} />
          <a
            href={`tel:${phone}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            📞 Call {phone}
          </a>
        </div>
      ) : (
        <button
          type="button"
          onClick={revealPhone}
          disabled={phoneLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          📞 {phoneLoading ? 'Loading…' : 'Show contact'}
        </button>
      )}
      {phoneError && <p className="text-xs text-rose-600">{phoneError}</p>}

      {/* One-tap quick messages */}
      {!sent && (
        <div className="flex flex-wrap gap-2">
          {QUICK_MESSAGES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => quickSend(q)}
              disabled={sending}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Inline chat (custom message) */}
      {!sent ? (
        <>
          <button
            type="button"
            onClick={() => { if (!user) { loginGate(); return; } setChatOpen((o) => !o); }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            💬 {chatOpen ? 'Close chat' : 'Custom message'}
          </button>
          {chatOpen && (
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message…"
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
              />
              {chatError && <p className="text-xs text-rose-600">{chatError}</p>}
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || !message.trim()}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
          <span className="text-emerald-600">✔</span>
          <span className="text-sm text-emerald-800 font-medium">Message sent!</span>
          <button
            type="button"
            onClick={() => router.push('/dashboard/messages')}
            className="ml-auto text-xs text-emerald-700 underline"
          >
            View chat
          </button>
        </div>
      )}

      {/* Save + Watch + Report row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSave}
          disabled={saveLoading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {saved ? '♥ Saved' : '♡ Save'}
        </button>
        <button
          type="button"
          onClick={toggleWatch}
          disabled={watchLoading}
          title={watching ? 'Stop watching price' : 'Watch for price drops'}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 transition-colors ${
            watching
              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {watching ? '🔔 Watching' : '🔔 Watch price'}
        </button>
        <button
          type="button"
          onClick={() => (user ? setReporting(true) : loginGate())}
          className="ml-auto text-xs text-slate-400 underline-offset-2 hover:underline"
        >
          Report
        </button>
      </div>

      {reporting && <ReportDialog listingId={listingId} onClose={() => setReporting(false)} />}
    </div>
  );
}
