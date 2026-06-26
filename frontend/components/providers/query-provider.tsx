'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,   // 5 min — avoids refetch on every page visit
        gcTime:    10 * 60_000,  // 10 min — keep cache alive across navigations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        retry: (failureCount, error: any) => {
          if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}
