"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Check, RefreshCw } from "lucide-react";
import JsBarcode from "jsbarcode";

/* ── EAN-13 Generator ──────────────────────────────────────────────── */
function generateEan13(): string {
  const prefix = '880';
  const store = '0001';
  const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
  const first12 = prefix + store + seq;
  const digits = first12.split('').map(Number);
  // EAN-13 check digit: sum odd-position digits * 1, even-position digits * 3
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return first12 + String(check);
}

/* ── Standard barcode label sizes ──────────────────────────────────── */
const BARCODE_SIZES = [
  { id: 'small', label: 'Small', desc: '38 x 21 mm', width: 200, height: 120, barcodeWidth: 1.5, barcodeHeight: 45, fontSize: 12 },
  { id: 'medium', label: 'Medium', desc: '50 x 25 mm', width: 260, height: 150, barcodeWidth: 1.8, barcodeHeight: 55, fontSize: 14 },
  { id: 'standard', label: 'Standard', desc: '58 x 30 mm', width: 300, height: 180, barcodeWidth: 2, barcodeHeight: 65, fontSize: 16 },
  { id: 'large', label: 'Large', desc: '70 x 40 mm', width: 360, height: 220, barcodeWidth: 2.2, barcodeHeight: 75, fontSize: 18 },
  { id: 'shelf', label: 'Shelf Label', desc: '80 x 50 mm', width: 420, height: 270, barcodeWidth: 2.5, barcodeHeight: 85, fontSize: 20 },
];

/* ── Types ─────────────────────────────────────────────────────────── */
export interface BarcodeItem {
  productName: string;
  variantName?: string;
  price: string;
  discountedPrice?: string;
  barcode: string;
  sku?: string;
}

interface BarcodeModalProps {
  items: BarcodeItem[];
  onClose: () => void;
  onBarcodeGenerated?: (index: number, barcode: string) => void;
}

/* ── Render barcode to canvas ──────────────────────────────────────── */
function renderBarcodeToCanvas(
  item: BarcodeItem,
  size: typeof BARCODE_SIZES[0],
  showTitle: boolean,
  showVariant: boolean,
  showPrice: boolean,
  showDiscount: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const scale = 2; // retina
  canvas.width = size.width * scale;
  canvas.height = size.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size.width, size.height);

  // Cut line border (thin dashed)
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(1, 1, size.width - 2, size.height - 2);
  ctx.setLineDash([]);

  const infoFont = Math.round(size.fontSize * 0.65);

  // Pre-calculate total content height for vertical centering
  let totalHeight = 0;
  const maxWidth = size.width - 16;

  // Temp helper for measuring wrapped lines
  const measureWrap = (text: string, font: string): number => {
    ctx.font = font;
    const words = text.split(' ');
    let lines = 0, currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) { lines++; currentLine = word; }
      else currentLine = testLine;
    }
    if (currentLine) lines++;
    return Math.min(lines, 2);
  };

  if (showTitle && item.productName) {
    totalHeight += measureWrap(item.productName, `bold ${infoFont}px Arial, sans-serif`) * (infoFont + 1) + 1;
  }
  if (showVariant && item.variantName) {
    totalHeight += measureWrap(item.variantName, `${infoFont - 1}px Arial, sans-serif`) * infoFont;
  }
  if (showPrice || showDiscount) {
    totalHeight += infoFont + 4;
  }
  totalHeight += size.barcodeHeight + size.fontSize + 4; // barcode + number below it

  let y = Math.max(4, (size.height - totalHeight) / 2);

  // Helper: wrap text into multiple lines
  const wrapText = (text: string, font: string, maxWidth: number): string[] => {
    ctx.font = font;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [text];
  };

  // Product title (wraps)
  if (showTitle && item.productName) {
    const titleFont = `bold ${infoFont}px Arial, sans-serif`;
    const maxWidth = size.width - 16;
    const lines = wrapText(item.productName, titleFont, maxWidth);
    ctx.fillStyle = '#111827';
    ctx.font = titleFont;
    ctx.textAlign = 'center';
    lines.slice(0, 2).forEach(line => { // max 2 lines
      ctx.fillText(line, size.width / 2, y + infoFont);
      y += infoFont + 1;
    });
    y += 1;
  }

  // Variant (wraps)
  if (showVariant && item.variantName) {
    const varFont = `${infoFont - 1}px Arial, sans-serif`;
    const maxWidth = size.width - 16;
    const lines = wrapText(item.variantName, varFont, maxWidth);
    ctx.fillStyle = '#6b7280';
    ctx.font = varFont;
    ctx.textAlign = 'center';
    lines.slice(0, 2).forEach(line => {
      ctx.fillText(line, size.width / 2, y + infoFont - 1);
      y += infoFont;
    });
  }

  // Price
  if (showPrice || showDiscount) {
    ctx.textAlign = 'center';
    const priceFont = infoFont + 1;
    const priceY = y + priceFont;
    if (showDiscount && item.discountedPrice && item.discountedPrice !== item.price) {
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${priceFont}px Arial, sans-serif`;
      const dpText = `\u09F3${item.discountedPrice}`;
      const dpWidth = ctx.measureText(dpText).width;

      ctx.fillStyle = '#9ca3af';
      ctx.font = `${infoFont - 1}px Arial, sans-serif`;
      const opText = `\u09F3${item.price}`;
      const opWidth = ctx.measureText(opText).width;

      const totalWidth = dpWidth + opWidth + 4;
      const startX = (size.width - totalWidth) / 2;

      ctx.fillStyle = '#111827';
      ctx.font = `bold ${priceFont}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(dpText, startX, priceY);

      ctx.fillStyle = '#9ca3af';
      ctx.font = `${infoFont - 1}px Arial, sans-serif`;
      const opX = startX + dpWidth + 4;
      ctx.fillText(opText, opX, priceY);
      ctx.beginPath();
      ctx.moveTo(opX, priceY - (infoFont - 1) / 2 + 1);
      ctx.lineTo(opX + opWidth, priceY - (infoFont - 1) / 2 + 1);
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else if (showPrice) {
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${priceFont}px Arial, sans-serif`;
      ctx.fillText(`\u09F3${item.price}`, size.width / 2, priceY);
    }
    y += priceFont + 3;
  }

  // Barcode -- always use CODE128 (works with any string)
  const barcodeCanvas = document.createElement('canvas');
  try {
    JsBarcode(barcodeCanvas, item.barcode, {
      format: 'CODE128',
      width: size.barcodeWidth,
      height: size.barcodeHeight,
      displayValue: true,
      fontSize: size.fontSize,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000',
    });
    const barcodeX = (size.width - barcodeCanvas.width / scale) / 2;
    ctx.drawImage(barcodeCanvas, 0, 0, barcodeCanvas.width, barcodeCanvas.height,
      Math.max(4, barcodeX), y, barcodeCanvas.width / scale, barcodeCanvas.height / scale);
  } catch {
    // Fallback: draw barcode number as text
    ctx.fillStyle = '#374151';
    ctx.font = `bold ${size.fontSize + 2}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(item.barcode, size.width / 2, y + size.barcodeHeight / 2);
  }

  return canvas;
}

/* ── Main Modal ────────────────────────────────────────────────────── */
export function BarcodeModal({ items, onClose, onBarcodeGenerated }: BarcodeModalProps) {
  const [showTitle, setShowTitle] = useState(true);
  const [showVariant, setShowVariant] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [selectedSize, setSelectedSize] = useState('standard');
  const [localItems, setLocalItems] = useState<BarcodeItem[]>(() =>
    items.map(item => item.barcode ? item : { ...item, barcode: generateEan13() })
  );
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(items.map((_, i) => [i, 1]))
  );
  const [bulkQty, setBulkQty] = useState('');
  const previewRef = useRef<HTMLCanvasElement>(null);

  const size = BARCODE_SIZES.find(s => s.id === selectedSize) || BARCODE_SIZES[2];
  const isBulk = localItems.length > 1;

  // Generate missing barcodes
  const generateMissing = () => {
    setLocalItems(prev => prev.map((item, i) => {
      if (item.barcode) return item;
      const bc = generateEan13();
      onBarcodeGenerated?.(i, bc);
      return { ...item, barcode: bc };
    }));
  };

  const missingCount = localItems.filter(i => !i.barcode).length;
  const readyCount = localItems.filter(i => i.barcode).length;
  const totalPrintCount = localItems.reduce((sum, item, i) => sum + (item.barcode ? (quantities[i] || 1) : 0), 0);

  // Expand items by quantity for printing
  const getExpandedItems = (): BarcodeItem[] => {
    const result: BarcodeItem[] = [];
    localItems.forEach((item, i) => {
      if (!item.barcode) return;
      const qty = quantities[i] || 1;
      for (let j = 0; j < qty; j++) result.push(item);
    });
    return result;
  };

  // Render preview
  useEffect(() => {
    if (!previewRef.current || localItems.length === 0) return;
    const firstWithBarcode = localItems.find(i => i.barcode);
    if (!firstWithBarcode) return;
    const rendered = renderBarcodeToCanvas(firstWithBarcode, size, showTitle, showVariant, showPrice, showDiscount);
    const ctx = previewRef.current.getContext('2d');
    if (!ctx) return;
    previewRef.current.width = rendered.width;
    previewRef.current.height = rendered.height;
    ctx.drawImage(rendered, 0, 0);
  }, [localItems, size, showTitle, showVariant, showPrice, showDiscount]);

  // Download single barcode
  const downloadSingle = (item: BarcodeItem) => {
    if (!item.barcode) return;
    const canvas = renderBarcodeToCanvas(item, size, showTitle, showVariant, showPrice, showDiscount);
    const link = document.createElement('a');
    const varPart = item.variantName ? `_${item.variantName.replace(/[^a-zA-Z0-9]/g, '-')}` : '';
    link.download = `${item.productName.replace(/[^a-zA-Z0-9]/g, '-')}${varPart}_${item.barcode}_${size.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Download all as ZIP
  const downloadAllZip = useCallback(async () => {
    const withBarcode = getExpandedItems();
    if (withBarcode.length === 0) return;

    if (withBarcode.length === 1) {
      downloadSingle(withBarcode[0]);
      return;
    }

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    withBarcode.forEach(item => {
      const canvas = renderBarcodeToCanvas(item, size, showTitle, showVariant, showPrice, showDiscount);
      const data = canvas.toDataURL('image/png').split(',')[1];
      const varPart = item.variantName ? `_${item.variantName.replace(/[^a-zA-Z0-9]/g, '-')}` : '';
      const fileName = `${item.productName.replace(/[^a-zA-Z0-9]/g, '-')}${varPart}_${item.barcode}_${size.id}.png`;
      zip.file(fileName, data, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.download = `barcodes_${size.id}_${withBarcode.length}items.zip`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [localItems, size, showTitle, showVariant, showPrice, showDiscount]);

  // Download PDF -- Label Printer (one sticker per page at sticker size)
  const downloadPdfLabel = useCallback(async () => {
    const withBarcode = getExpandedItems();
    if (withBarcode.length === 0) return;

    const { default: jsPDF } = await import('jspdf');

    const sizeMap: Record<string, [number, number]> = {
      small: [38, 21], medium: [50, 25], standard: [58, 30], large: [70, 40], shelf: [80, 50],
    };
    const [pageW, pageH] = sizeMap[size.id] || [58, 30];

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageW, pageH] });

    withBarcode.forEach((item, idx) => {
      if (idx > 0) pdf.addPage([pageW, pageH]);
      const canvas = renderBarcodeToCanvas(item, size, showTitle, showVariant, showPrice, showDiscount);
      const imgData = canvas.toDataURL('image/png');
      const pad = 0.5;
      pdf.addImage(imgData, 'PNG', pad, pad, pageW - pad * 2, pageH - pad * 2);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);
      pdf.setLineDashPattern([1, 0.5], 0);
      pdf.rect(0.25, 0.25, pageW - 0.5, pageH - 0.5);
    });

    pdf.save(`barcodes_label_${size.id}_${withBarcode.length}items.pdf`);
  }, [localItems, size, showTitle, showVariant, showPrice, showDiscount]);

  // Download PDF -- A4 Sheet (multiple stickers per page with cut lines)
  const downloadPdfA4 = useCallback(async () => {
    const withBarcode = getExpandedItems();
    if (withBarcode.length === 0) return;

    const { default: jsPDF } = await import('jspdf');

    const pageW = 210; // A4
    const pageH = 297;
    const margin = 8;
    const sizeMap: Record<string, [number, number]> = {
      small: [38, 21], medium: [50, 25], standard: [58, 30], large: [70, 40], shelf: [80, 50],
    };
    const [stickerW, stickerH] = sizeMap[size.id] || [58, 30];
    const gap = 2;

    const cols = Math.floor((pageW - margin * 2 + gap) / (stickerW + gap));
    const rows = Math.floor((pageH - margin * 2 + gap) / (stickerH + gap));
    const perPage = cols * rows;

    const gridW = cols * stickerW + (cols - 1) * gap;
    const gridH = rows * stickerH + (rows - 1) * gap;
    const offsetX = (pageW - gridW) / 2;
    const offsetY = (pageH - gridH) / 2;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header on first page
    pdf.setFontSize(7);
    pdf.setTextColor(180, 180, 180);
    pdf.text(`${withBarcode.length} barcodes | ${size.label} (${stickerW}x${stickerH}mm) | ${cols}x${rows} per page`, pageW / 2, 5, { align: 'center' });

    withBarcode.forEach((item, idx) => {
      if (idx > 0 && idx % perPage === 0) {
        pdf.addPage();
        pdf.setFontSize(7);
        pdf.setTextColor(180, 180, 180);
        pdf.text(`Page ${Math.floor(idx / perPage) + 1} | ${size.label} (${stickerW}x${stickerH}mm)`, pageW / 2, 5, { align: 'center' });
      }

      const posOnPage = idx % perPage;
      const col = posOnPage % cols;
      const row = Math.floor(posOnPage / cols);
      const x = offsetX + col * (stickerW + gap);
      const y = offsetY + row * (stickerH + gap);

      const canvas = renderBarcodeToCanvas(item, size, showTitle, showVariant, showPrice, showDiscount);
      const imgData = canvas.toDataURL('image/png');

      // Sticker background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x, y, stickerW, stickerH, 'F');

      // Barcode image
      const imgPad = 0.3;
      pdf.addImage(imgData, 'PNG', x + imgPad, y + imgPad, stickerW - imgPad * 2, stickerH - imgPad * 2);

      // Cut line (dashed border)
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.1);
      pdf.setLineDashPattern([1, 0.8], 0);
      pdf.rect(x, y, stickerW, stickerH);
    });

    pdf.save(`barcodes_a4sheet_${size.id}_${withBarcode.length}items.pdf`);
  }, [localItems, size, showTitle, showVariant, showPrice, showDiscount]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {isBulk ? `Download ${localItems.length} Barcodes` : 'Download Barcode'}
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {isBulk ? 'Configure and download all selected barcodes' : localItems[0]?.productName}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Missing barcodes warning */}
          {missingCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700">{missingCount} item{missingCount > 1 ? 's' : ''} missing barcode</p>
              <Button variant="secondary" size="sm" onClick={generateMissing}>
                <RefreshCw size={12} /> Generate Missing
              </Button>
            </div>
          )}

          {/* Preview */}
          <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
            <canvas ref={previewRef} style={{ maxWidth: '100%', height: 'auto' }} />
          </div>

          {/* Show/hide checkboxes */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">What to show on label</p>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showTitle} onChange={e => setShowTitle(e.target.checked)} className="rounded" />
                <span className="text-xs text-gray-700">Product Title</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showVariant} onChange={e => setShowVariant(e.target.checked)} className="rounded" />
                <span className="text-xs text-gray-700">Variant Name</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="rounded" />
                <span className="text-xs text-gray-700">Price</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showDiscount} onChange={e => setShowDiscount(e.target.checked)} className="rounded" />
                <span className="text-xs text-gray-700">Discounted Price</span>
              </label>
            </div>
          </div>

          {/* Size options */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Label Size</p>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {BARCODE_SIZES.map(s => (
                <button key={s.id} type="button" onClick={() => setSelectedSize(s.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-center transition-all ${
                    selectedSize === s.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="text-[11px] font-medium text-gray-900">{s.label}</span>
                  <span className="text-[9px] text-gray-400">{s.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              {totalPrintCount} sticker{totalPrintCount !== 1 ? 's' : ''} will print. Label Printer: one per page ({size.desc}). A4 Sheet: grid with cut lines.
            </p>
          </div>

          {/* Quantity */}
          <div>
            {!isBulk ? (
              /* Single barcode -- simple quantity input */
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">How many stickers?</p>
                <input type="number" min="1" value={quantities[0] || 1}
                  onChange={e => setQuantities({ 0: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-20 h-9 px-3 text-sm text-center border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
              </div>
            ) : (
              /* Bulk -- per-item quantities */
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">
                    Quantity per barcode
                    <span className="text-gray-400 font-normal ml-1">({totalPrintCount} total)</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">Set all:</span>
                    <input type="number" min="1" value={bulkQty} placeholder="1"
                      onChange={e => {
                        setBulkQty(e.target.value);
                        const n = parseInt(e.target.value) || 1;
                        setQuantities(Object.fromEntries(localItems.map((_, i) => [i, n])));
                      }}
                      className="w-14 h-7 px-2 text-xs text-center border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                  {localItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-0 text-xs">
                      {item.barcode ? (
                        <Check size={12} className="text-green-500 shrink-0" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-amber-200 shrink-0" />
                      )}
                      <span className="text-gray-800 flex-1 truncate">
                        {item.productName}{item.variantName ? ` - ${item.variantName}` : ''}
                      </span>
                      <input type="number" min="1" value={quantities[i] || 1}
                        onChange={e => setQuantities(prev => ({ ...prev, [i]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-12 h-6 px-1.5 text-[10px] text-center border border-gray-200 rounded focus:border-gray-400 outline-none shrink-0" />
                      {item.barcode && (
                        <button type="button" onClick={() => downloadSingle(item)}
                          className="text-gray-400 hover:text-gray-700 shrink-0">
                          <Download size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm"
              disabled={readyCount === 0}
              onClick={downloadPdfLabel}>
              <Download size={14} /> Label Printer
            </Button>
            <Button variant="secondary" size="sm"
              disabled={readyCount === 0}
              onClick={downloadPdfA4}>
              <Download size={14} /> A4 Sheet
            </Button>
            <Button size="sm"
              disabled={readyCount === 0}
              onClick={downloadAllZip}>
              <Download size={14} /> PNG {isBulk && readyCount > 1 ? 'ZIP' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
