import { useState, useEffect } from 'react';
import storage, { STORAGE_KEYS } from '../utils/storage';

export interface User {
  id: string;
  email: string;
  name?: string;
  [key: string]: unknown;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = storage.getItem(STORAGE_KEYS.USER);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  return { user, loading };
}
