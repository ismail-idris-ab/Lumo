'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatSummary, MessageDTO } from '@lumo/shared';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { inputClassName } from '@/components/ui/field';

export default function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const { data: chatData } = useQuery({
    queryKey: ['chats'],
    queryFn: () => api.get<{ chats: ChatSummary[] }>('/chats'),
  });
  const chats = chatData?.chats ?? [];

  const { data: msgData } = useQuery({
    queryKey: ['chat', activeId],
    queryFn: () => api.get<{ messages: MessageDTO[] }>(`/chats/${activeId}/messages`),
    enabled: !!activeId,
  });
  const messages = msgData?.messages ?? [];

  // Realtime: join the active room, refresh on inbound messages.
  useEffect(() => {
    const socket = getSocket();
    const onNew = (m: MessageDTO) => {
      if (m.chatId === activeId) qc.invalidateQueries({ queryKey: ['chat', activeId] });
      qc.invalidateQueries({ queryKey: ['chats'] });
    };
    const onUnread = () => qc.invalidateQueries({ queryKey: ['chats'] });
    socket.on('message:new', onNew);
    socket.on('chat:unread', onUnread);
    if (activeId) socket.emit('chat:join', activeId);
    return () => {
      socket.off('message:new', onNew);
      socket.off('chat:unread', onUnread);
    };
  }, [activeId, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function send() {
    const body = draft.trim();
    if (!body || !activeId) return;
    getSocket().emit('message:send', { chatId: activeId, body });
    setDraft('');
  }

  return (
    <div className="grid h-[70vh] gap-4 md:grid-cols-[260px_1fr]">
      {/* Thread list */}
      <aside className="space-y-1 overflow-y-auto rounded-lg border p-2">
        <h1 className="px-2 py-1 text-sm font-semibold">Messages</h1>
        {chats.length === 0 && <p className="px-2 text-sm text-muted-foreground">No conversations yet.</p>}
        {chats.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={cn(
              'w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent',
              activeId === c.id && 'bg-accent',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="truncate font-medium">{c.otherUser.name}</span>
              {c.unreadCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {c.unreadCount}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{c.listingTitle}</p>
            {c.lastMessage && <p className="truncate text-xs text-muted-foreground">{c.lastMessage.body}</p>}
          </button>
        ))}
      </aside>

      {/* Thread */}
      <section className="flex flex-col rounded-lg border">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('flex', m.senderId === user?.id ? 'justify-end' : 'justify-start')}
                >
                  <span
                    className={cn(
                      'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                      m.senderId === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    )}
                  >
                    {m.body}
                  </span>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 border-t p-2">
              <input
                className={inputClassName}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Type a message…"
              />
              <Button onClick={send} disabled={!draft.trim()}>
                Send
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
