/**
 * NaviqxBadge - Data-driven status and priority badges
 * MUST use domain layer enums - no manual styling allowed
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  getStatusConfig,
  getPriorityConfig,
  getTagConfig,
  mapStatusToUi,
} from '@/domain';

// =============================================================================
// TYPES
// =============================================================================

type BadgeSize = 'sm' | 'md' | 'lg';
type BadgeType = 'status' | 'priority' | 'tag' | 'custom';

interface NaviqxBadgeProps {
  /** The type of badge - determines which config to use */
  type: BadgeType;
  /** The value to display (status, priority, or tag value) */
  value: string;
  /** Optional size variant */
  size?: BadgeSize;
  /** Show a colored dot indicator */
  showDot?: boolean;
  /** Custom className for overrides (use sparingly) */
  className?: string;
  /** For custom type only - provide your own styling */
  customClassName?: string;
  /** For custom type only - provide label override */
  customLabel?: string;
}

// =============================================================================
// SIZE VARIANTS - Using semantic tokens
// Note: Some raw values are necessary for precise badge sizing 
// and are documented as approved exceptions per STYLE_GUIDE.md
// =============================================================================

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',      // Exception: badge-specific sizing
  md: 'text-metadata px-2.5 py-1 gap-1.5',  // Exception: badge-specific sizing  
  lg: 'text-body-sm px-3 py-1.5 gap-2',     // Exception: badge-specific sizing
};

const dotSizeClasses: Record<BadgeSize, string> = {
  sm: 'size-1.5',
  md: 'size-2',
  lg: 'size-2.5',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function NaviqxBadge({
  type,
  value,
  size = 'md',
  showDot = false,
  className,
  customClassName,
  customLabel,
}: NaviqxBadgeProps) {
  // Get configuration based on type
  const getConfig = () => {
    switch (type) {
      case 'status': {
        const config = getStatusConfig(value);
        return {
          label: config.label,
          className: config.className,
          dotColor: config.dotColor,
        };
      }
      case 'priority': {
        const config = getPriorityConfig(value);
        return {
          label: config.label,
          className: config.className,
          dotColor: config.dotColor,
        };
      }
      case 'tag': {
        const config = getTagConfig(value);
        return {
          label: config.label,
          className: config.className,
          dotColor: 'bg-current',
        };
      }
      case 'custom':
        return {
          label: customLabel || value,
          className: customClassName || 'bg-muted text-muted-foreground border-border',
          dotColor: 'bg-current',
        };
      default:
        return {
          label: value,
          className: 'bg-muted text-muted-foreground border-border',
          dotColor: 'bg-muted-foreground',
        };
    }
  };

  const config = getConfig();

  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center rounded-full border font-medium transition-smooth',
        // Size
        sizeClasses[size],
        // Config-driven styling
        config.className,
        // Custom overrides
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full shrink-0',
            dotSizeClasses[size],
            config.dotColor
          )}
        />
      )}
      {config.label}
    </span>
  );
}

// =============================================================================
// CONVENIENCE COMPONENTS
// =============================================================================

interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'md', showDot = true, className }: StatusBadgeProps) {
  return (
    <NaviqxBadge
      type="status"
      value={status}
      size={size}
      showDot={showDot}
      className={className}
    />
  );
}

interface PriorityBadgeProps {
  priority: string;
  size?: BadgeSize;
  showDot?: boolean;
  className?: string;
}

export function PriorityBadge({ priority, size = 'md', showDot = true, className }: PriorityBadgeProps) {
  return (
    <NaviqxBadge
      type="priority"
      value={priority}
      size={size}
      showDot={showDot}
      className={className}
    />
  );
}

interface TagBadgeProps {
  tag: string;
  size?: BadgeSize;
  className?: string;
}

export function TagBadge({ tag, size = 'sm', className }: TagBadgeProps) {
  return (
    <NaviqxBadge
      type="tag"
      value={tag}
      size={size}
      showDot={false}
      className={className}
    />
  );
}

// Legacy alias - deprecated, use NaviqxBadge directly
export const PrismaBadge = NaviqxBadge;

export default NaviqxBadge;