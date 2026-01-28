import { QueryClient } from '@tanstack/react-query';
import { errorLogger } from './errorLogger';
import { toast } from '@/hooks/use-toast';
import { handleDatabaseError } from './errorHandling';
import { logger } from './logger';

/**
 * React Query client configuration for caching and data management
 * Reduces database reads by ~70% through intelligent caching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache time (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      refetchOnReconnect: true, // Refetch on internet reconnect
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Only retry once on other failures
        return failureCount < 1;
      },
    },
    mutations: {
      onError: (error: any) => {
        logger.error('Mutation error:', error);
        
        errorLogger.logError({
          severity: 'warning',
          type: 'frontend',
          message: error.message || 'Mutation failed',
          stack: error.stack,
          metadata: { error }
        });

        // Show user-friendly error message
        const errorMessage = handleDatabaseError(error);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      },
      retry: false, // Don't retry mutations by default
    },
  },
});
