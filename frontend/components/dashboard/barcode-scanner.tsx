"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, Keyboard, Search, AlertTriangle, ImageIcon, Upload } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('manual');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [imageError, setImageError] = useState('');
  const scannerRef = useRef<any>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus manual input
  useEffect(() => {
    if (mode === 'manual') {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [mode]);

  // Start camera scanner
  useEffect(() => {
    if (mode !== 'camera') return;
    let mounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        const scanner = new Html5Qrcode('barcode-reader', {
          verbose: false,
        });
        scannerRef.current = scanner;
        setCameraError('');

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.777,
            disableFlip: false,
          },
          (decodedText) => {
            scanner.stop().then(() => {
              scannerRef.current = null;
              onScan(decodedText.trim());
              onClose();
            }).catch(() => {
              onScan(decodedText.trim());
              onClose();
            });
          },
          () => {} // ignore failures
        );
        if (mounted) setScanning(true);
      } catch (err: any) {
        if (!mounted) return;
        setScanning(false);
        if (err?.message?.includes('Permission')) {
          setCameraError('Camera permission denied. Please allow camera access or use Manual input.');
        } else if (err?.message?.includes('NotFound') || err?.message?.includes('not found')) {
          setCameraError('No camera found on this device. Use Manual input instead.');
        } else {
          setCameraError('Could not start camera. Try Manual input.');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      const s = scannerRef.current;
      if (s) {
        try {
          const state = s.getState?.();
          if (state === 2 || state === 3) { // SCANNING or PAUSED
            s.stop().catch(() => {});
          }
        } catch {
          // scanner not in a stoppable state, ignore
        }
        scannerRef.current = null;
      }
    };
  }, [mode, onScan, onClose]);

  // Handle image file scan
  const handleImageScan = async (file: File) => {
    if (file.size > 1024 * 1024 * 2) {
      setImageError('Image too large. Max 2MB.');
      return;
    }
    setImageError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('barcode-image-scanner');
      const result = await scanner.scanFile(file, true);
      scanner.clear();
      if (result) {
        onScan(result.trim());
        onClose();
      }
    } catch {
      setImageError('Could not detect barcode in this image. Try a clearer photo.');
    }
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code) {
      onScan(code);
      setManualCode('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Scan Barcode</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100">
          <button type="button" onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
              mode === 'manual' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Keyboard size={14} /> Manual / USB Scanner
          </button>
          <button type="button" onClick={() => setMode('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
              mode === 'camera' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Camera size={14} /> Camera
          </button>
        </div>

        <div className="p-5">
          {/* Manual mode */}
          {mode === 'manual' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Type the barcode number or use a USB barcode scanner. The scanner will automatically input the code.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleManualSubmit(); }}
                    placeholder="Enter or scan barcode..."
                    autoFocus
                    className="w-full h-10 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none"
                  />
                </div>
                <Button size="sm" disabled={!manualCode.trim()} onClick={handleManualSubmit}>
                  Look up
                </Button>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  <strong>USB Barcode Scanner:</strong> Just click in the input field and scan -- the device types the barcode automatically and presses Enter.
                </p>
              </div>
            </div>
          )}

          {/* Camera mode */}
          {mode === 'camera' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Point your camera at the barcode. It will scan automatically.
              </p>
              {cameraError ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertTriangle size={20} className="text-amber-600" />
                  </div>
                  <p className="text-xs text-gray-600 text-center max-w-xs">{cameraError}</p>
                  <Button variant="secondary" size="sm" onClick={() => setMode('manual')}>
                    <Keyboard size={12} /> Switch to Manual
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div id="barcode-reader" className="rounded-xl overflow-hidden bg-black" style={{ minHeight: 250 }} />
                  {!scanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
                      <div className="flex flex-col items-center gap-2">
                        <Camera size={24} className="text-gray-400 animate-pulse" />
                        <p className="text-xs text-gray-500">Starting camera...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Upload barcode image */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-2">Or upload a barcode image</p>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg py-3 px-4 flex items-center gap-3 hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => imageInputRef.current?.click()}>
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <ImageIcon size={14} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-700">Click to upload barcode image</p>
                    <p className="text-[10px] text-gray-400">PNG, JPG up to 2MB. Must be clear and well-lit.</p>
                  </div>
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageScan(file);
                    e.target.value = '';
                  }} />
                {imageError && (
                  <p className="text-[11px] text-red-500 mt-1.5">{imageError}</p>
                )}
              </div>
              {/* Hidden div for image scanner */}
              <div id="barcode-image-scanner" className="hidden" />

              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Supports EAN-13, EAN-8, UPC-A, CODE-128, CODE-39, QR Code
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
