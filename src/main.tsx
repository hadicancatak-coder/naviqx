import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { errorLogger } from "./lib/errorLogger";
import { logger } from "./lib/logger";

// Global error handlers with enhanced logging
window.addEventListener('error', (event) => {
  // Prevent default error handling
  event.preventDefault();
  
  logger.error('Global error:', event.error);
  
  errorLogger.logError({
    severity: 'critical',
    type: 'frontend',
    message: event.message || 'Unknown error',
    stack: event.error?.stack,
    metadata: { 
      filename: event.filename, 
      lineno: event.lineno, 
      colno: event.colno,
      error: event.error
    }
  });
});

window.addEventListener('unhandledrejection', (event) => {
  // Prevent default error handling
  event.preventDefault();
  
  logger.error('Unhandled promise rejection:', event.reason);
  
  const reason = event.reason;
  const message = reason?.message || reason?.toString() || 'Unknown promise rejection';
  const stack = reason?.stack;
  
  errorLogger.logError({
    severity: 'warning',
    type: 'frontend',
    message: `Unhandled Promise Rejection: ${message}`,
    stack,
    metadata: { 
      reason,
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
