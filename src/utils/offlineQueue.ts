import storage, { STORAGE_KEYS } from './storage';

/**
 * Offline mutation queue — stores failed mutations when offline
 * and replays them when connectivity returns.
 *
 * Mutations older than 24h are discarded on processing.
 */

interface QueuedMutation {
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body: unknown;
  queuedAt: number; // timestamp
}

const QUEUE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const getQueue = (): QueuedMutation[] => {
  try {
    return JSON.parse(storage.getItem(STORAGE_KEYS.OFFLINE_QUEUE) || '[]');
  } catch {
    return [];
  }
};

const saveQueue = (queue: QueuedMutation[]): void => {
  storage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
};

/**
 * Add a failed mutation to the offline queue.
 */
export const queueMutation = (method: 'POST' | 'PUT' | 'DELETE', path: string, body: unknown): void => {
  const queue = getQueue();
  queue.push({ method, path, body, queuedAt: Date.now() });
  saveQueue(queue);
};

/**
 * Process all queued mutations using the provided API function.
 * Discards items older than 24h. Removes successfully sent items.
 * Returns count of processed/failed items.
 */
export const processMutationQueue = async (
  apiFn: {
    post: (path: string, body: unknown) => Promise<unknown>;
    put: (path: string, body: unknown) => Promise<unknown>;
    delete: (path: string) => Promise<unknown>;
  }
): Promise<{ processed: number; failed: number; discarded: number }> => {
  const queue = getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, discarded: 0 };

  const now = Date.now();
  let processed = 0;
  let failed = 0;
  let discarded = 0;
  const remaining: QueuedMutation[] = [];

  for (const item of queue) {
    // Discard expired items
    if (now - item.queuedAt > QUEUE_TTL) {
      discarded++;
      continue;
    }

    try {
      if (item.method === 'POST') {
        await apiFn.post(item.path, item.body);
      } else if (item.method === 'PUT') {
        await apiFn.put(item.path, item.body);
      } else if (item.method === 'DELETE') {
        await apiFn.delete(item.path);
      }
      processed++;
    } catch {
      // Keep in queue for next retry
      remaining.push(item);
      failed++;
    }
  }

  saveQueue(remaining);
  return { processed, failed, discarded };
};

/**
 * Get the number of pending mutations in the queue.
 */
export const getMutationQueueLength = (): number => {
  return getQueue().length;
};
