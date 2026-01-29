import { toast } from "@/hooks/use-toast";
import { errorLogger } from "./errorLogger";
import { logger } from "./logger";
import type { UnsafeAny } from '@/types/unsafe';

/**
 * Safe async wrapper that catches and handles errors gracefully
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Safe async error:", error);
    
    errorLogger.logError({
      severity: 'warning',
      type: 'frontend',
      message: errorMessage || err?.message || 'An unexpected error occurred',
      stack: err?.stack,
      metadata: { error }
    });

    if (errorMessage) {
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
    
    return null;
  }
};

/**
 * Safe URL constructor that validates and handles errors
 * Note: Uses normalizeUrl from urlHelpers for consistent URL handling
 */
export const safeURL = (url: string, base?: string): URL | null => {
  try {
    // Import normalizeUrl inline to avoid circular dependency
    const trimmed = url.trim();
    const urlWithProtocol = trimmed.match(/^https?:\/\//i) ? trimmed : 
      (trimmed.includes('://') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) ? trimmed : `https://${trimmed}`;
    return new URL(urlWithProtocol, base);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Invalid URL:", { url, error });
    errorLogger.logError({
      severity: 'warning',
      type: 'frontend',
      message: `Failed to construct URL: ${url}`,
      stack: err?.stack,
      metadata: { url, base }
    });
    return null;
  }
};

/**
 * Safe mutation wrapper for React Query mutations
 */
export const safeMutate = async <T, V>(
  mutateFn: (variables: V) => Promise<T>,
  variables: V,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (data: T) => void;
    onError?: (error: unknown) => void;
  }
): Promise<{ data: T | null; error: unknown | null }> => {
  try {
    const data = await mutateFn(variables);
    
    if (options?.successMessage) {
      toast({
        title: "Success",
        description: options.successMessage,
      });
    }
    
    options?.onSuccess?.(data);
    
    return { data, error: null };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Mutation error:", error);
    
    errorLogger.logError({
      severity: 'warning',
      type: 'frontend',
      message: options?.errorMessage || err?.message || 'Mutation failed',
      stack: err?.stack,
      metadata: { variables, error }
    });

    const errorMessage = options?.errorMessage || err?.message || 'An unexpected error occurred';
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive"
    });
    
    options?.onError?.(error);
    
    return { data: null, error };
  }
};

/**
 * Safe promise handler that catches rejections
 */
export const safePromise = <T>(
  promise: Promise<T>,
  errorMessage?: string
): Promise<T | null> => {
  return promise.catch((error: unknown) => {
    const err = error as Error;
    logger.error("Promise rejection:", error);
    
    errorLogger.logError({
      severity: 'warning',
      type: 'frontend',
      message: errorMessage || err?.message || 'Promise rejected',
      stack: err?.stack,
      metadata: { error }
    });

    return null;
  });
};

/**
 * Wrap a function with error boundary
 */
export const withErrorBoundary = <T extends (...args: UnsafeAny[]) => UnsafeAny>(
  fn: T,
  errorMessage?: string
): T => {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      const result = fn(...args);
      
      // If result is a promise, wrap it
      if (result instanceof Promise) {
        return result.catch((error: unknown) => {
          const err = error as Error;
          logger.error("Function error:", error);
          
          errorLogger.logError({
            severity: 'warning',
            type: 'frontend',
            message: errorMessage || err?.message || 'Function execution failed',
            stack: err?.stack,
            metadata: { args, error }
          });

          if (errorMessage) {
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive"
            });
          }
          
          throw error;
        }) as ReturnType<T>;
      }
      
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error("Function error:", error);
      
      errorLogger.logError({
        severity: 'critical',
        type: 'frontend',
        message: errorMessage || err?.message || 'Function execution failed',
        stack: err?.stack,
        metadata: { args, error }
      });

      if (errorMessage) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
      throw error;
    }
  }) as T;
};

/**
 * Database error handler - provides user-friendly messages for common DB errors
 */
export const handleDatabaseError = (error: unknown): string => {
  const err = error as { code?: string; message?: string };
  const code = err?.code;
  const message = err?.message || '';

  // PostgreSQL error codes
  const errorMessages: Record<string, string> = {
    '23505': 'This record already exists',
    '23503': 'Cannot delete - this item is referenced by other records',
    '23502': 'Required field is missing',
    '42P01': 'Database table not found',
    '42703': 'Database column not found',
    'PGRST204': 'Column not found in database schema',
    'PGRST116': 'No rows found',
  };

  // Check for specific error codes
  if (code && errorMessages[code]) {
    return errorMessages[code];
  }

  // Check for column not found in message
  if (message.includes('column') && message.includes('does not exist')) {
    const match = message.match(/"([^"]+)"/);
    const columnName = match ? match[1] : 'field';
    return `Database error: ${columnName} column not found. Please contact support.`;
  }

  // Default message
  return 'A database error occurred. Please try again or contact support.';
};
