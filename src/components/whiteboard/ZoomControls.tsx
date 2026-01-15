import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
  onResetZoom: () => void;
  className?: string;
}

export function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onResetZoom,
  className,
}: ZoomControlsProps) {
  const zoomPercent = Math.round(scale * 100);

  return (
    <div
      className={cn(
        "flex items-center gap-xs bg-card/90 backdrop-blur-sm border border-border rounded-lg p-xs shadow-sm",
        className
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomOut}
            disabled={scale <= 0.25}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom out (Ctrl -)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onResetZoom}
            className="min-w-[52px] text-center text-metadata font-medium text-muted-foreground hover:text-foreground transition-colors px-xs"
          >
            {zoomPercent}%
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Reset to 100%</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomIn}
            disabled={scale >= 4}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom in (Ctrl +)</TooltipContent>
      </Tooltip>

      <div className="w-px h-4 bg-border mx-xs" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomToFit}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Fit to content</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onResetZoom}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Reset view</TooltipContent>
      </Tooltip>
    </div>
  );
}
