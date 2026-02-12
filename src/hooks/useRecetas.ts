import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import type { Receta } from '../types';

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Module-level cache shared across all hook instances
let cachedRecetas: Receta[] | null = null;
let cachedUserId: string | null = null;
let cacheTimestamp = 0;
let fetchPromise: Promise<Receta[]> | null = null;

export function useRecetas(userId: string | null | undefined) {
  const [recetas, setRecetas] = useState<Receta[]>(cachedRecetas || []);
  const [loading, setLoading] = useState(!cachedRecetas);
  const mountedRef = useRef(true);

  const load = useCallback(async (force = false) => {
    if (!userId) return;

    // Return cache if fresh and same user
    const now = Date.now();
    if (!force && cachedUserId === userId && cachedRecetas && (now - cacheTimestamp) < CACHE_TTL) {
      setRecetas(cachedRecetas);
      setLoading(false);
      return;
    }

    // Deduplicate concurrent fetches
    if (!fetchPromise) {
      setLoading(true);
      fetchPromise = api.get(`/api/recetas/${userId}`).finally(() => {
        fetchPromise = null;
      });
    }

    try {
      const data = await fetchPromise;
      cachedRecetas = data || [];
      cachedUserId = userId;
      cacheTimestamp = Date.now();
      if (mountedRef.current) {
        setRecetas(cachedRecetas);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return { recetas, loading, refetch };
}

// Helper: invalidate cache (call after mutations like uploading a new receta)
export function invalidateRecetasCache() {
  cachedRecetas = null;
  cachedUserId = null;
  cacheTimestamp = 0;
}
