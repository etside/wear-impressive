'use client';

/**
 * Responsive YouTube video modal — opens from the storefront's "Watch Video"
 * button on a product page.
 *
 * Layout:
 *   - Backdrop: full-screen black/60 overlay; click closes.
 *   - Panel:    centered, max-w-4xl on desktop; full viewport width on
 *               mobile (no awkward letterboxing). 16:9 aspect ratio is
 *               enforced via `aspect-video` so the iframe always fills
 *               the frame regardless of container width.
 *   - Esc key + dedicated X button also close.
 *
 * The iframe is unmounted on close (we don't keep a hidden one playing),
 * so audio stops immediately and YouTube doesn't keep counting as a view.
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { youTubeEmbedUrl } from '@/lib/youtube';

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string | null | undefined;
  /** Optional accessible label for the dialog. */
  title?: string;
}

export function VideoModal({ open, onClose, videoUrl, title = 'Product video' }: VideoModalProps) {
  // Lock body scroll while open so wheel/touch goes to the panel, not
  // the page beneath. Restore the previous overflow on close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const embed = youTubeEmbedUrl(videoUrl, { autoplay: true });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop — click to close */}
      <button
        type="button"
        aria-label="Close video"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 transition-opacity"
      />

      {/* Panel */}
      <div className="relative w-full max-w-4xl">
        {/* Close button — sits above the player so it's always reachable */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-10 right-0 sm:-top-2 sm:-right-12 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
          {embed ? (
            <iframe
              src={embed}
              title={title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70 px-4 text-center">
              Couldn&rsquo;t load this video.
              <br />
              The link doesn&rsquo;t look like a valid YouTube URL.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
