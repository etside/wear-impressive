'use client';
import { useState, useRef, useCallback } from 'react';
import { ImageCropModal } from '@/components/ui/image-crop-modal';
import { Upload, X, ImageIcon, GripVertical, Loader2 } from 'lucide-react';
import { filesApi } from '@/lib/api/services/vendor-content';

/**
 * Uploads a Blob/File to /vendor/files and returns the public URL.
 * Centralised here so single + multi variants share one path and the
 * component never persists `blob:` URLs back into the parent's state.
 */
async function uploadAsset(blob: Blob, folder = 'product-images'): Promise<string> {
  // FileReader/createObjectURL gives us a Blob; turn it into a File so the
  // backend gets a proper original_name + extension.
  const file = blob instanceof File
    ? blob
    : new File([blob], `image-${Date.now()}.${(blob.type.split('/')[1] || 'jpg').split('+')[0]}`, { type: blob.type || 'image/jpeg' });
  const asset = await filesApi.upload(file, { folder });
  return asset.url;
}

/* ── Single Image Upload ──────────────────────────────────────────── */
interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onFileSelect?: (file: Blob) => void;
  variant?: 'avatar' | 'cover' | 'square' | 'product';
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  fallback?: string;
  accept?: string;
  maxSizeMB?: number;
  cropWidth?: number;
  cropHeight?: number;
  cropLabel?: string;
}

export function ImageUpload({
  value, onChange, onFileSelect,
  variant = 'square',
  className = '',
  disabled = false,
  placeholder,
  fallback,
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 5,
  cropWidth, cropHeight, cropLabel,
}: ImageUploadProps) {
  const [showCrop, setShowCrop] = useState(false);
  const [pendingFile, setPendingFile] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasCrop = !!cropWidth && !!cropHeight;

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    // Validate MIME type
    if (!file.type.startsWith('image/')) return;
    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) return;
    // Validate magic bytes (actual file content, not just extension)
    const SIGNATURES: Record<string, number[]> = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF
      'image/gif': [0x47, 0x49, 0x46],
    };
    const sig = SIGNATURES[file.type];
    if (sig) {
      const buf = await file.slice(0, sig.length).arrayBuffer();
      const bytes = new Uint8Array(buf);
      if (!sig.every((b, i) => bytes[i] === b)) return; // fake file, reject silently
    }

    if (hasCrop) {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingFile(reader.result as string);
        setShowCrop(true);
      };
      reader.readAsDataURL(file);
    } else {
      // Upload immediately and emit the server URL — never emit blob: URLs,
      // they only exist in the current browser session and 404 on reload.
      setUploading(true);
      try {
        const url = await uploadAsset(file);
        onChange(url);
        onFileSelect?.(file);
      } catch {
        setUploadError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  }, [hasCrop, maxSizeMB, onChange, onFileSelect]);

  const handleCropComplete = useCallback(async (blob: Blob) => {
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadAsset(blob);
      onChange(url);
      onFileSelect?.(blob);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Delay state reset to avoid React batching issues
      setTimeout(() => {
        setShowCrop(false);
        setPendingFile('');
      }, 50);
    }
  }, [onChange, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, handleFile]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  const triggerPick = () => {
    if (!disabled) fileRef.current?.click();
  };

  /* ── Avatar variant ─────────── */
  if (variant === 'avatar') {
    return (
      <>
        <div className={`flex items-center gap-3 ${className}`}>
          <div
            className="relative w-14 h-14 rounded-full border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors shrink-0"
            onClick={triggerPick}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            {value ? (
              <img src={value} alt="" className="w-full h-full object-cover" />
            ) : fallback ? (
              <span className="text-sm font-semibold text-gray-400">{fallback}</span>
            ) : (
              <ImageIcon size={18} className="text-gray-300" />
            )}
            {value && (
              <button
                onClick={handleRemove}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600"
              >
                <X size={10} />
              </button>
            )}
          </div>
          <div>
            <button type="button" onClick={triggerPick} disabled={disabled}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50">
              {value ? 'Change' : 'Upload'}
            </button>
            {cropWidth && cropHeight && (
              <p className="text-[10px] text-gray-400 mt-0.5">{cropWidth}x{cropHeight}px</p>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept={accept} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        {hasCrop && (
          <ImageCropModal
            open={showCrop}
            onClose={() => { setShowCrop(false); setPendingFile(''); }}
            onCropComplete={handleCropComplete}
            targetWidth={cropWidth!}
            targetHeight={cropHeight!}
            label={cropLabel || 'Crop Image'}
            initialImage={pendingFile}
            maxSizeMB={maxSizeMB}
          />
        )}
      </>
    );
  }

  /* ── Cover variant (wide banner) ─────────── */
  if (variant === 'cover') {
    return (
      <>
        <div
          className={`relative w-full h-32 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer hover:border-gray-400 transition-colors bg-gray-50 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
          onClick={triggerPick}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          {value ? (
            <>
              <img src={value} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <span className="text-xs text-white font-medium bg-black/50 px-3 py-1.5 rounded-lg">Change</span>
              </div>
              <button onClick={handleRemove}
                className="absolute top-2 right-2 w-6 h-6 bg-white/90 text-gray-600 rounded-full flex items-center justify-center shadow-sm hover:bg-white">
                <X size={12} />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1.5">
              <Upload size={18} className="text-gray-300" />
              <p className="text-xs text-gray-500">{placeholder || 'Drop cover image or click to browse'}</p>
              {cropWidth && cropHeight && (
                <p className="text-[10px] text-gray-400">{cropWidth}x{cropHeight}px recommended</p>
              )}
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept={accept} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        {hasCrop && (
          <ImageCropModal
            open={showCrop}
            onClose={() => { setShowCrop(false); setPendingFile(''); }}
            onCropComplete={handleCropComplete}
            targetWidth={cropWidth!}
            targetHeight={cropHeight!}
            label={cropLabel || 'Crop Cover'}
            initialImage={pendingFile}
            maxSizeMB={maxSizeMB}
          />
        )}
      </>
    );
  }

  /* ── Square / Product variant (default) ─────────── */
  return (
    <>
      <div
        className={`relative rounded-xl border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer hover:border-gray-400 transition-colors bg-gray-50 aspect-square ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
        onClick={triggerPick}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-xs text-white font-medium bg-black/50 px-3 py-1.5 rounded-lg">Change</span>
            </div>
            <button onClick={handleRemove}
              className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/90 text-gray-600 rounded-full flex items-center justify-center shadow-sm hover:bg-white">
              <X size={10} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1.5 p-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Upload size={14} className="text-gray-400" />
            </div>
            <p className="text-[11px] text-gray-500 text-center leading-snug">
              {placeholder || 'Click or drop'}
            </p>
            {cropWidth && cropHeight && (
              <p className="text-[10px] text-gray-400">{cropWidth}x{cropHeight}</p>
            )}
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      {hasCrop && (
        <ImageCropModal
          open={showCrop}
          onClose={() => { setShowCrop(false); setPendingFile(''); }}
          onCropComplete={handleCropComplete}
          targetWidth={cropWidth!}
          targetHeight={cropHeight!}
          label={cropLabel || 'Crop Image'}
          initialImage={pendingFile}
          maxSizeMB={maxSizeMB}
        />
      )}
    </>
  );
}

/* ── Multi Image Upload ───────────────────────────────────────────── */
interface MultiImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  onFilesSelect?: (files: Blob[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  cropWidth?: number;
  cropHeight?: number;
  cropLabel?: string;
  maxSizeMB?: number;
  placeholder?: string;
}

export function MultiImageUpload({
  values, onChange, onFilesSelect,
  maxFiles = 8,
  disabled = false,
  className = '',
  cropWidth, cropHeight, cropLabel,
  maxSizeMB = 5,
  placeholder,
}: MultiImageUploadProps) {
  const [showCrop, setShowCrop] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [cropIndex, setCropIndex] = useState(0);
  const croppedBlobsRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hasCrop = !!cropWidth && !!cropHeight;

  const handleFiles = useCallback(async (files: FileList) => {
    const remaining = maxFiles - values.length;
    const selected = Array.from(files)
      .filter(f => f.type.startsWith('image/') && f.size <= maxSizeMB * 1024 * 1024)
      .slice(0, remaining);

    if (selected.length === 0) return;

    if (hasCrop) {
      const readers: Promise<string>[] = selected.map(file =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
      );
      Promise.all(readers).then(dataUrls => {
        setPendingFiles(dataUrls);
        setCropIndex(0);
        croppedBlobsRef.current = [];
        setShowCrop(true);
      });
    } else {
      // Upload all selected files in parallel and emit only server URLs.
      // Never emits blob: URLs, which only exist in the current browser
      // session and 404 on every reload.
      setUploadError(null);
      setUploading(true);
      try {
        const uploaded = await Promise.all(selected.map((f) => uploadAsset(f)));
        onChange([...values, ...uploaded]);
        onFilesSelect?.(selected);
      } catch {
        setUploadError('One or more uploads failed. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  }, [values, maxFiles, maxSizeMB, hasCrop, onChange, onFilesSelect]);

  const handleCropComplete = useCallback(async (blob: Blob) => {
    croppedBlobsRef.current.push(blob);

    const nextIdx = cropIndex + 1;
    if (nextIdx < pendingFiles.length) {
      // More images to crop -- advance index
      setCropIndex(nextIdx);
      return;
    }

    // All cropped — upload the batch, emit server URLs only.
    const finalBlobs = [...croppedBlobsRef.current];
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await Promise.all(finalBlobs.map((b) => uploadAsset(b)));
      onChange([...values, ...uploaded]);
      onFilesSelect?.(finalBlobs);
    } catch {
      setUploadError('One or more uploads failed. Please try again.');
    } finally {
      setUploading(false);
      setShowCrop(false);
      setPendingFiles([]);
      setCropIndex(0);
      croppedBlobsRef.current = [];
    }
  }, [cropIndex, pendingFiles.length, values, onChange, onFilesSelect]);

  const handleRemove = useCallback((idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  }, [values, onChange]);

  const handleReorder = useCallback((from: number, to: number) => {
    const updated = [...values];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated);
  }, [values, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files.length) handleFiles(files);
  }, [disabled, handleFiles]);

  const canAdd = values.length < maxFiles;

  return (
    <>
      <div className={className}>
        {/* Thumbnail grid */}
        {values.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
            {values.map((url, i) => (
              <div key={`${url}-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 text-[9px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
                    Cover
                  </span>
                )}
                <button
                  onClick={() => handleRemove(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-white/90 text-gray-600 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <X size={10} />
                </button>
                {/* Drag handle hint */}
                {values.length > 1 && (
                  <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-60 transition-opacity">
                    <GripVertical size={12} className="text-white drop-shadow" />
                  </div>
                )}
              </div>
            ))}

            {/* Add more slot */}
            {canAdd && (
              <div
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50/50"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={14} className="text-gray-300 mb-1" />
                <span className="text-[10px] text-gray-400">Add</span>
              </div>
            )}
          </div>
        )}

        {/* Empty state - larger drop zone */}
        {values.length === 0 && (
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl py-8 px-4 flex flex-col items-center justify-center gap-2 hover:border-gray-400 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Upload size={18} className="text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {placeholder || 'Drop images here or click to browse'}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {cropWidth && cropHeight ? `${cropWidth}x${cropHeight}px` : 'JPG, PNG, WebP'} -- up to {maxFiles} images, first is cover
              </p>
            </div>
          </div>
        )}

        {/* Count */}
        {values.length > 0 && (
          <p className="text-[10px] text-gray-400 mt-1">
            {values.length}/{maxFiles} images -- first image is the cover photo
          </p>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }} />

      {/* Status — uploading + error feedback so the wait isn't silent. */}
      {uploading && (
        <p className="mt-2 text-[11px] text-gray-500 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Uploading…
        </p>
      )}
      {uploadError && (
        <p className="mt-2 text-[11px] text-red-600">{uploadError}</p>
      )}

      {/* Sequential crop modal */}
      {hasCrop && showCrop && pendingFiles[cropIndex] && (
        <ImageCropModal
          open={showCrop}
          onClose={() => {
            // Discard anything still in flight; user can re-pick if they want.
            setShowCrop(false);
            setPendingFiles([]);
            setCropIndex(0);
            croppedBlobsRef.current = [];
          }}
          onCropComplete={handleCropComplete}
          targetWidth={cropWidth!}
          targetHeight={cropHeight!}
          label={`${cropLabel || 'Crop Image'} (${cropIndex + 1}/${pendingFiles.length})`}
          initialImage={pendingFiles[cropIndex]}
          maxSizeMB={maxSizeMB}
        />
      )}
    </>
  );
}
