import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { errorLogger } from "./lib/errorLogger";
import { logger } from "./lib/logger";

// Known transient error patterns that shouldn't be logged to database
const TRANSIENT_ERROR_PATTERNS = [
  'useAuth must be used within an AuthProvider',
  'useTaskDetailContext called outside provider',
  'useSidebar must be used within a SidebarProvider',
  'useTheme must be used within a ThemeProvider',
  'Cannot read properties of null',
  'ResizeObserver loop',
];

function isTransientError(message: string): boolean {
  return TRANSIENT_ERROR_PATTERNS.some(pattern => 
    message.includes(pattern)
  );
}

// Global error handlers with enhanced logging
window.addEventListener('error', (event) => {
  event.preventDefault();
  
  const message = event.message || 'Unknown error';
  
  // Skip transient development errors
  if (isTransientError(message)) {
    logger.debug('Skipped transient error:', message);
    return;
  }
  
  logger.error('Global error:', event.error);
  
  errorLogger.logError({
    severity: 'critical',
    type: 'frontend',
    message,
    stack: event.error?.stack,
    metadata: { 
      filename: event.filename, 
      lineno: event.lineno, 
      colno: event.colno,
    }
  });
});

window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  
  const reason = event.reason;
  const message = reason?.message || reason?.toString() || 'Unknown promise rejection';
  
  // Skip transient development errors
  if (isTransientError(message)) {
    logger.debug('Skipped transient rejection:', message);
    return;
  }
  
  logger.error('Unhandled promise rejection:', event.reason);
  
  errorLogger.logError({
    severity: 'warning',
    type: 'frontend',
    message: `Unhandled Promise Rejection: ${message}`,
    stack: reason?.stack,
    metadata: { 
      reasonType: typeof reason,
      reasonConstructor: reason?.constructor?.name
    }
  });
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
