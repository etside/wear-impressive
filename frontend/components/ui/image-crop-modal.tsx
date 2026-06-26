'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { X, Upload, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  onCropComplete: (blob: Blob, previewUrl: string) => void;
  targetWidth: number;
  targetHeight: number;
  label?: string;
  initialImage?: string;
  accept?: string;
  maxSizeMB?: number;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

export function ImageCropModal({
  open, onClose, onCropComplete,
  targetWidth, targetHeight,
  label = 'Crop Image',
  initialImage,
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 5,
}: ImageCropModalProps) {
  const [imgSrc, setImgSrc] = useState<string>(initialImage || '');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [error, setError] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const aspect = targetWidth / targetHeight;

  // Sync imgSrc when initialImage changes (sequential cropping)
  useEffect(() => {
    if (initialImage) {
      setImgSrc(initialImage);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [initialImage]);

  const handleFileSelect = useCallback((file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, [maxSizeMB]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setCrop(centerAspectCrop(w, h, aspect));
  }, [aspect]);

  const handleCrop = useCallback(async () => {
    const image = imgRef.current;
    if (!image || !completedCrop) return;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const cropX = (completedCrop.x ?? 0) * scaleX;
    const cropY = (completedCrop.y ?? 0) * scaleY;
    const cropW = (completedCrop.width ?? 0) * scaleX;
    const cropH = (completedCrop.height ?? 0) * scaleY;

    ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, targetWidth, targetHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const previewUrl = URL.createObjectURL(blob);
        onCropComplete(blob, previewUrl);
      },
      'image/jpeg',
      0.92,
    );
  }, [completedCrop, targetWidth, targetHeight, onCropComplete]);

  const handleClose = useCallback(() => {
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setError('');
    onClose();
  }, [onClose]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-[95vw] max-w-[540px] max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {targetWidth} x {targetHeight}px
              {aspect === 1 ? ' (square)' : aspect > 1.5 ? ' (wide)' : ` (${Math.round(aspect * 10) / 10}:1)`}
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center p-4 min-h-0">
          {!imgSrc ? (
            /* Upload area */
            <div
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:border-gray-400 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Upload size={18} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Drop image here or click to browse</p>
              <p className="text-[11px] text-gray-400">JPG, PNG, WebP up to {maxSizeMB}MB</p>
            </div>
          ) : (
            /* Crop area - responsive, contained */
            <div className="w-full flex-1 min-h-0 flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, pc) => setCrop(pc)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-full [&_img]:max-h-[55vh] [&_img]:max-w-full [&_img]:object-contain"
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ maxHeight: '55vh', maxWidth: '100%', objectFit: 'contain' }}
                />
              </ReactCrop>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 shrink-0">
          <div>
            {imgSrc && (
              <Button variant="secondary" size="sm" onClick={() => { setImgSrc(''); setCrop(undefined); }}>
                <RotateCw size={12} /> Change image
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
            {imgSrc && (
              <Button size="sm" onClick={handleCrop} disabled={!completedCrop}>
                Crop & Save
              </Button>
            )}
          </div>
        </div>

        <input ref={fileRef} type="file" accept={accept} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }} />
      </div>
    </div>
  );
}
