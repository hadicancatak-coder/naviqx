import React, { Component, ReactNode } from 'react';
import { errorLogger } from '@/lib/errorLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Error is logged to errorLogger below - no console.error needed
    
    errorLogger.logError({
      severity: 'critical',
      type: 'frontend',
      message: error.message,
      stack: error.stack,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-md">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-xs">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-md">
              <p className="text-body-sm text-muted-foreground">
                An unexpected error occurred. This has been logged and will be reviewed.
              </p>
              {this.state.error && (
                <div className="p-sm bg-muted rounded-md">
                  <p className="text-metadata font-mono text-muted-foreground">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
