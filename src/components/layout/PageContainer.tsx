import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Use 'default' for standard content pages, 'full' for tool pages like SearchPlanner, 'wide' for maximum width */
  size?: 'default' | 'full' | 'narrow' | 'wide';
}

/**
 * Standard page container with consistent max-width and padding
 * Used across all pages for layout consistency
 * Typography: H1=24px, H2=20px, H3=18px, Body=14-16px
 * Spacing: 32px top, 24px between cards
 */
export function PageContainer({ 
  children, 
  className,
  size = 'default' 
}: PageContainerProps) {
  return (
    <div 
      className={cn(
        "min-h-screen",
        // Consistent vertical spacing
        "pt-xl pb-xl",
        // Consistent horizontal padding
        size === 'default' && "px-xl lg:px-2xl",
        size === 'wide' && "px-lg lg:px-xl",
        size === 'full' && "px-md lg:px-lg",
        size === 'narrow' && "px-xl lg:px-2xl",
        className
      )}
    >
      <div 
        className={cn(
          "mx-auto",
          // Gap between sections
          "space-y-lg",
          // Max widths: 1440px for wide, 1280px for default
          size === 'default' && "max-w-[1280px]",
          size === 'wide' && "max-w-[1440px]",
          size === 'full' && "max-w-full",
          size === 'narrow' && "max-w-4xl"
        )}
      >
        {children}
      </div>
    </div>
  );
}
