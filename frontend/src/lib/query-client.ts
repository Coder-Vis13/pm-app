import { QueryClient } from "@tanstack/react-query";

const STALE_TIME_MS = 2 * 60 * 1000;
const GC_TIME_MS = 10 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: GC_TIME_MS,
      refetchOnWindowFocus: false,
    },
  },
});

export { queryClient };
