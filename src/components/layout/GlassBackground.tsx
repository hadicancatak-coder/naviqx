import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassBackgroundProps {
  children: ReactNode;
  className?: string;
  /** Use 'centered' for auth/MFA pages, 'full' for full-page layouts */
  variant?: 'centered' | 'full';
}

/**
 * Reusable liquid glass background with decorative orbs
 * Provides consistent visual treatment for standalone pages outside the main Layout
 */
export function GlassBackground({ 
  children, 
  className,
  variant = 'centered' 
}: GlassBackgroundProps) {
  return (
    <div 
      className={cn(
        "min-h-screen bg-background relative overflow-hidden",
        variant === 'centered' && "flex items-center justify-center p-md",
        className
      )}
    >
      {/* Decorative glass orbs - matching main Layout design */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Base gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-transparent to-slate-900/50 dark:from-[hsl(220,25%,10%)]/50 dark:via-transparent dark:to-[hsl(225,28%,8%)]/50" />
        
        {/* Primary orb - top right */}
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/15 blur-[140px]" />
        
        {/* Deep blue orb - bottom left */}
        <div className="absolute bottom-[-20%] left-[-15%] w-[700px] h-[700px] rounded-full bg-info/12 blur-[160px]" />
        
        {/* Accent orb - center left */}
        <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] rounded-full bg-success/8 blur-[120px]" />
        
        {/* Cyan accent - bottom right */}
        <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>
      
      {/* Content layer */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
