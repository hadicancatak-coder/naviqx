import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { GlassBackground } from "@/components/layout/GlassBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <GlassBackground variant="centered">
      <div className="flex flex-col items-center">
        <Card className="glass-elevated p-lg text-center max-w-md w-full">
          <h1 className="mb-md text-4xl font-bold text-foreground">404</h1>
          <p className="mb-lg text-xl text-muted-foreground">Oops! Page not found</p>
          <Button asChild>
            <a href="/">
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </a>
          </Button>
        </Card>
        <p className="mt-6 text-metadata text-muted-foreground">
          © 2026 Naviqx • CFI Performance Marketing
        </p>
      </div>
    </GlassBackground>
  );
};

export default NotFound;
