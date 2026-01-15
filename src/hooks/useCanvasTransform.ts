import { useState, useCallback, useRef, useEffect } from "react";

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface UseCanvasTransformOptions {
  minScale?: number;
  maxScale?: number;
  initialTransform?: Partial<Transform>;
}

export function useCanvasTransform(options: UseCanvasTransformOptions = {}) {
  const { minScale = 0.25, maxScale = 4, initialTransform } = options;

  const [transform, setTransform] = useState<Transform>({
    x: initialTransform?.x ?? 0,
    y: initialTransform?.y ?? 0,
    scale: initialTransform?.scale ?? 1,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, transformX: 0, transformY: 0 });

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Only zoom when Ctrl/Cmd is pressed
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(maxScale, Math.max(minScale, transform.scale * (1 + delta)));

        // Zoom toward mouse position
        const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          // Calculate the point in canvas coordinates before zoom
          const canvasX = (mouseX - transform.x) / transform.scale;
          const canvasY = (mouseY - transform.y) / transform.scale;

          // Calculate new transform to keep that point under the mouse
          const newX = mouseX - canvasX * newScale;
          const newY = mouseY - canvasY * newScale;

          setTransform({ x: newX, y: newY, scale: newScale });
        }
      }
    },
    [transform, minScale, maxScale]
  );

  // Handle pan start (middle mouse or space + left click)
  const handlePanStart = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          transformX: transform.x,
          transformY: transform.y,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [isSpacePressed, transform]
  );

  const handlePanMove = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - panStartRef.current.x;
        const deltaY = e.clientY - panStartRef.current.y;
        setTransform((prev) => ({
          ...prev,
          x: panStartRef.current.transformX + deltaX,
          y: panStartRef.current.transformY + deltaY,
        }));
      }
    },
    [isPanning]
  );

  const handlePanEnd = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [isPanning]);

  // Space key for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(maxScale, prev.scale * 1.2),
    }));
  }, [maxScale]);

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(minScale, prev.scale / 1.2),
    }));
  }, [minScale]);

  const zoomToFit = useCallback(
    (items: Array<{ x: number; y: number; width: number; height: number }>, containerWidth: number, containerHeight: number) => {
      if (items.length === 0) {
        setTransform({ x: 0, y: 0, scale: 1 });
        return;
      }

      // Calculate bounding box of all items
      const minX = Math.min(...items.map((i) => i.x));
      const minY = Math.min(...items.map((i) => i.y));
      const maxX = Math.max(...items.map((i) => i.x + i.width));
      const maxY = Math.max(...items.map((i) => i.y + i.height));

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      // Add padding
      const padding = 100;
      const scaleX = (containerWidth - padding * 2) / contentWidth;
      const scaleY = (containerHeight - padding * 2) / contentHeight;
      const newScale = Math.min(1, Math.max(minScale, Math.min(scaleX, scaleY)));

      // Center the content
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const newX = containerWidth / 2 - centerX * newScale;
      const newY = containerHeight / 2 - centerY * newScale;

      setTransform({ x: newX, y: newY, scale: newScale });
    },
    [minScale]
  );

  const resetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      return {
        x: (screenX - transform.x) / transform.scale,
        y: (screenY - transform.y) / transform.scale,
      };
    },
    [transform]
  );

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number): { x: number; y: number } => {
      return {
        x: canvasX * transform.scale + transform.x,
        y: canvasY * transform.scale + transform.y,
      };
    },
    [transform]
  );

  return {
    transform,
    setTransform,
    isPanning,
    isSpacePressed,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    zoomIn,
    zoomOut,
    zoomToFit,
    resetZoom,
    screenToCanvas,
    canvasToScreen,
  };
}
