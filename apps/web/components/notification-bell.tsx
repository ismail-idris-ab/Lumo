'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import type { NotificationDTO } from '@lumo/shared';
import { api } from '@/lib/api-client';
import { formatNotification, timeAgo } from '@/lib/notifications';
import { getSocket } from '@/lib/socket';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Live updates arrive over the socket (apps/api's notify() emits 'notification:new');
// this is just a fallback in case the socket drops.
const POLL_MS = 120_000;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ items: NotificationDTO[]; unreadCount: number }>('/notifications');
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — badge just won't update this cycle
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    function onNew(n: NotificationDTO) {
      setItems((prev) => (prev.some((i) => i.id === n.id) ? prev : [n, ...prev]));
      if (!n.readAt) setUnreadCount((c) => c + 1);
    }
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function onItemClick(n: NotificationDTO) {
    const { href } = formatNotification(n);
    if (!n.readAt) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, readAt: new Date().toISOString() } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
      void api.post(`/notifications/${n.id}/read`).catch(() => {});
    }
    setOpen(false);
    if (href) router.push(href);
  }

  async function onMarkAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    await api.post('/notifications/read-all').catch(() => {});
  }

  return (
    <div className="relative">
      <Tooltip label="Notifications">
        <button
          ref={triggerRef}
          type="button"
          aria-label="Notifications"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition-colors hover:bg-amber-100"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-md border bg-background shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet</p>
            ) : (
              items.map((n) => {
                const { title } = formatNotification(n);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void onItemClick(n)}
                    className={cn(
                      'flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-accent',
                      !n.readAt && 'bg-emerald-50/60',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />}
                      <span className={cn('truncate', !n.readAt && 'font-medium')}>{title}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
