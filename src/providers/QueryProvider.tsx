import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // 2 min default
      gcTime: 10 * 60 * 1000,          // 10 min garbage collection
      retry: false,                     // api.ts already has retry logic
      refetchOnWindowFocus: false,      // avoid unexpected refetches
    },
  },
});

export { queryClient };

export const AppQueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);
