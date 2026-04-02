import * as React from "react";

import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  hideScrollbar?: boolean;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, hideScrollbar = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative min-h-0 overflow-x-hidden overflow-y-auto",
        hideScrollbar && "hide-scrollbar",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
ScrollArea.displayName = "ScrollArea";

interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

const ScrollBar = React.forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = "vertical", ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      data-orientation={orientation}
      className={cn("hidden", className)}
      {...props}
    />
  ),
);
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };