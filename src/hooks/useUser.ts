import { useState, useEffect } from 'react';

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
    const stored = localStorage.getItem('user');
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
