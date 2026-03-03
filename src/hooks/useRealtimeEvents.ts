import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Maps event types to React Query keys that should be invalidated.
 * When the backend broadcasts an event, we invalidate the corresponding
 * cached queries so the UI refreshes automatically.
 */
const EVENT_QUERY_MAP: Record<string, string[][]> = {
  solicitud_updated: [['solicitudes'], ['recetas']],
  enrollment_updated: [['user-record']],
  membership_updated: [['user-record'], ['protocol']],
};

/**
 * Hook that subscribes to Supabase Realtime broadcast on channel `user:{userId}`.
 * The backend sends events when admin actions or webhooks change user-relevant data.
 * On each event, the corresponding React Query caches are invalidated for instant UI updates.
 */
export function useRealtimeEvents(userId: string | undefined) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const subscribe = useCallback(() => {
    if (!userId) return;

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`user:${userId}`)
      .on('broadcast', { event: 'update' }, (payload) => {
        const eventType = payload.payload?.event_type as string;
        const keysToInvalidate = EVENT_QUERY_MAP[eventType];

        if (keysToInvalidate) {
          keysToInvalidate.forEach(queryKey => {
            qc.invalidateQueries({ queryKey });
          });
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Auto-reconnect after 5s on error
          setTimeout(subscribe, 5000);
        }
      });

    channelRef.current = channel;
  }, [userId, qc]);

  useEffect(() => {
    subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe]);
}
