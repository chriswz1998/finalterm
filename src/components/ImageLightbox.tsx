import { useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';

export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string | null;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/90 hover:text-white border border-white/30 bg-black/40"
        aria-label="关闭"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function ZoomableImage({
  src,
  alt,
  caption,
  onZoom,
}: {
  src: string;
  alt: string;
  caption?: string;
  onZoom: (src: string, alt: string) => void;
}) {
  return (
    <figure className="group border border-neutral-200 bg-white p-2 relative">
      <button
        type="button"
        onClick={() => onZoom(src, alt)}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
        aria-label={`放大查看：${alt}`}
      >
        <img src={src} alt={alt} className="w-full h-auto rounded-sm" loading="lazy" />
        <span className="absolute top-3 right-3 p-1.5 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-4 h-4" />
        </span>
      </button>
      {caption && (
        <figcaption className="text-[10px] text-neutral-400 font-mono mt-1 text-center">{caption}</figcaption>
      )}
    </figure>
  );
}
