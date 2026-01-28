import { logger } from './logger';

/**
 * Performance monitoring utilities
 * Logs query performance in development mode
 */
export const logQuery = (operation: string, startTime: number) => {
  if (import.meta.env.DEV) {
    const duration = Date.now() - startTime;
    logger.debug(`[Query] ${operation}: ${duration}ms`);
  }
};

export const measureQueryTime = async <T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    logQuery(operation, startTime);
    return result;
  } catch (error) {
    logQuery(`${operation} (ERROR)`, startTime);
    throw error;
  }
};
