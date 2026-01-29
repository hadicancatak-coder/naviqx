import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-card px-md py-xs text-body-sm text-card-foreground shadow-sm transition-smooth file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-card-foreground placeholder:text-muted-foreground hover:bg-card-hover hover:border-input focus-visible:outline-none focus-visible:bg-card-hover focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 [overflow-wrap:break-word]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
