import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: { url: string; caption?: string }[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export const ImageLightbox = ({
  images,
  initialIndex = 0,
  open,
  onClose,
}: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
  }, [initialIndex, open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
          setZoom(1);
          break;
        case "ArrowRight":
          setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
          setZoom(1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, images.length, onClose]);

  if (!open || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };
  
  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  };

  const content = (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" />

      {/* Top bar: Close & Zoom controls */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-4 w-4 mr-1" />
            <span className="text-xs">{Math.round(zoom * 100)}%</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={handleZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 h-10 w-10"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main image area */}
      <div
        className="relative flex items-center justify-center w-full h-full px-16 py-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 z-10"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 z-10"
              onClick={goToNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Image container */}
        <div className="relative max-w-full max-h-full overflow-auto flex items-center justify-center">
          <img
            src={currentImage.url}
            alt={currentImage.caption || "Image"}
            className="max-w-[85vw] max-h-[75vh] object-contain transition-transform duration-200 rounded-lg shadow-2xl"
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom bar: Caption, counter, thumbnails */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        {/* Caption and counter */}
        <div className="text-center mb-3">
          {currentImage.caption && (
            <p className="text-white text-sm mb-1 max-w-lg mx-auto">
              {currentImage.caption}
            </p>
          )}
          {images.length > 1 && (
            <p className="text-white/60 text-xs">
              {currentIndex + 1} of {images.length}
            </p>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 max-w-[80vw] mx-auto overflow-x-auto py-2">
            {images.map((img, index) => (
              <button
                key={index}
                className={cn(
                  "flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all",
                  index === currentIndex
                    ? "border-white opacity-100 ring-2 ring-white/30"
                    : "border-transparent opacity-40 hover:opacity-70"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                  setZoom(1);
                }}
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render at document body level
  return createPortal(content, document.body);
};
