import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
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

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing parent dialog
    onClose();
  };

  const content = (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: 99999 }}
    >
      {/* Backdrop - click to close */}
      <div 
        className="absolute inset-0 bg-black/95 cursor-pointer" 
        onClick={handleBackdropClick}
      />

      {/* Top bar */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setZoom((prev) => Math.max(prev - 0.5, 0.5))}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-white/80 text-sm min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="flex items-center gap-1 text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setZoom((prev) => Math.min(prev + 0.5, 3))}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
        
        <button
          className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Navigation arrows - Left */}
      {images.length > 1 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 p-3 rounded-full transition-colors z-20"
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Navigation arrows - Right */}
      {images.length > 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 p-3 rounded-full transition-colors z-20"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Image container - clicking on image doesn't close */}
      <div 
        className="relative z-10 max-w-[85vw] max-h-[70vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.url}
          alt={currentImage.caption || "Image"}
          className="max-w-full max-h-[70vh] object-contain transition-transform duration-200 rounded-lg shadow-2xl"
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
        />
      </div>

      {/* Bottom bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
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
                onClick={() => {
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

  return createPortal(content, document.body);
};
