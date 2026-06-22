'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatSummary } from '@lumo/shared';
import { api } from './api-client';
import { getSocket } from './socket';

const QUERY_KEY = ['unread-messages'];

// Shared across every mount point (desktop icon + mobile bottom-nav tab) via react-query's
// cache — one fetch, one socket listener's invalidation refetches both badges together.
export function useUnreadMessages(enabled: boolean): number {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<{ chats: ChatSummary[] }>('/chats');
      return res.chats.reduce((sum, c) => sum + c.unreadCount, 0);
    },
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    function onUnread() {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    }
    socket.on('chat:unread', onUnread);
    return () => {
      socket.off('chat:unread', onUnread);
    };
  }, [qc, enabled]);

  return enabled ? data ?? 0 : 0;
}
