import { jsPDF } from 'jspdf';

interface SlipItem {
  name: string;
  sku: string;
  qtyOrdered: number;
  qtyShipped: number;
  variant?: string;
}

interface PackingSlipData {
  storeName: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  items: SlipItem[];
  paymentStatus: 'paid' | 'partial' | 'cod';
  amountDue: number; // for COD or partial
  totalAmount: number;
  returnPolicy: string;
  trackingUrl?: string;
}

function esc(s: string): string {
  return s.replace(/[^\x20-\x7E\u0980-\u09FF]/g, '');
}

export function generatePackingSlipPdf(data: PackingSlipData): Blob {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] }); // ~4x6 inch
  const w = 100;
  let y = 8;

  // Store name
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.storeName, w / 2, y, { align: 'center' });
  y += 5;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('PACKING SLIP', w / 2, y, { align: 'center' });
  y += 6;

  // Divider
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.3);
  pdf.line(5, y, w - 5, y);
  y += 5;

  // Order info
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Order: ${data.orderNumber}`, 5, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Date: ${data.orderDate}`, w - 5, y, { align: 'right' });
  y += 4;
  pdf.text(`Customer: ${data.customerName}`, 5, y);
  y += 6;

  // Payment status (prominent for COD)
  if (data.paymentStatus === 'cod') {
    pdf.setFillColor(255, 240, 240);
    pdf.rect(5, y - 3, w - 10, 8, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(200, 0, 0);
    pdf.text(`COD - COLLECT: BDT ${data.amountDue.toLocaleString()}`, w / 2, y + 2, { align: 'center' });
    pdf.setTextColor(0);
    y += 10;
  } else if (data.paymentStatus === 'partial') {
    pdf.setFillColor(255, 248, 230);
    pdf.rect(5, y - 3, w - 10, 8, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(180, 120, 0);
    pdf.text(`PARTIAL - DUE: BDT ${data.amountDue.toLocaleString()}`, w / 2, y + 2, { align: 'center' });
    pdf.setTextColor(0);
    y += 10;
  } else {
    pdf.setFillColor(235, 255, 235);
    pdf.rect(5, y - 3, w - 10, 8, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 128, 0);
    pdf.text('PAID', w / 2, y + 2, { align: 'center' });
    pdf.setTextColor(0);
    y += 10;
  }

  // Items header
  pdf.setDrawColor(200);
  pdf.line(5, y, w - 5, y);
  y += 4;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Product', 5, y);
  pdf.text('SKU', 55, y);
  pdf.text('Qty', 78, y, { align: 'center' });
  pdf.text('Ship', 90, y, { align: 'center' });
  y += 1;
  pdf.line(5, y, w - 5, y);
  y += 4;

  // Items
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  data.items.forEach(item => {
    const name = item.name.length > 28 ? item.name.slice(0, 26) + '..' : item.name;
    pdf.text(name, 5, y);
    if (item.variant) {
      y += 3;
      pdf.setTextColor(120);
      pdf.text(item.variant, 7, y);
      pdf.setTextColor(0);
    }
    pdf.text(item.sku, 55, y);
    pdf.text(String(item.qtyOrdered), 78, y, { align: 'center' });
    pdf.text(String(item.qtyShipped), 90, y, { align: 'center' });
    y += 5;
  });

  // Divider
  y += 2;
  pdf.line(5, y, w - 5, y);
  y += 5;

  // Total items
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Total items: ${data.items.reduce((s, i) => s + i.qtyShipped, 0)}`, 5, y);
  y += 8;

  // Return policy
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100);
  const policyLines = pdf.splitTextToSize(data.returnPolicy, w - 10);
  pdf.text(policyLines, 5, y);
  y += policyLines.length * 3 + 5;

  // Thank you
  pdf.setTextColor(0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Thank you for your order!', w / 2, y, { align: 'center' });

  return pdf.output('blob');
}

/* ── Shipping Label ───────────────────────────────────────────────── */
interface ShippingLabelData {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  orderNumber: string;
  orderDate: string;
  paymentStatus: 'paid' | 'partial' | 'cod';
  amountDue: number;
  courier: string;
  weight?: string;
  barcode?: string;
  itemCount: number;
}

export function generateShippingLabelPdf(data: ShippingLabelData): Blob {
  // Standard 10x15cm (4x6 inch) label
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
  const w = 100;
  let y = 6;

  // ── FROM section ──
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(120);
  pdf.text('FROM:', 5, y);
  y += 3;
  pdf.setFontSize(8);
  pdf.setTextColor(0);
  pdf.text(data.storeName, 5, y);
  y += 3;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(80);
  const fromLines = pdf.splitTextToSize(data.storeAddress, 60);
  pdf.text(fromLines, 5, y);
  y += fromLines.length * 2.5;
  pdf.text(data.storePhone, 5, y);
  y += 5;

  // Divider
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.line(3, y, w - 3, y);
  y += 5;

  // ── TO section (large) ──
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(120);
  pdf.text('SHIP TO:', 5, y);
  y += 4;

  pdf.setFontSize(12);
  pdf.setTextColor(0);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.customerName, 5, y);
  y += 5;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const toLines = pdf.splitTextToSize(data.customerAddress, w - 10);
  pdf.text(toLines, 5, y);
  y += toLines.length * 3.5;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.customerPhone, 5, y);
  y += 7;

  // Divider
  pdf.setLineWidth(0.3);
  pdf.line(3, y, w - 3, y);
  y += 4;

  // ── Order info row ──
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Order: ${data.orderNumber}`, 5, y);
  pdf.text(`Date: ${data.orderDate}`, w - 5, y, { align: 'right' });
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Courier: ${data.courier}`, 5, y);
  pdf.text(`Items: ${data.itemCount}`, w / 2, y, { align: 'center' });
  if (data.weight) pdf.text(`Weight: ${data.weight}`, w - 5, y, { align: 'right' });
  y += 6;

  // ── Payment Status (BIG) ──
  const statusH = 14;
  if (data.paymentStatus === 'cod') {
    pdf.setFillColor(220, 0, 0);
    pdf.rect(3, y, w - 6, statusH, 'F');
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('COD', 8, y + 5);
    pdf.setFontSize(16);
    pdf.text(`BDT ${data.amountDue.toLocaleString()}`, w - 8, y + 5, { align: 'right' });
    pdf.setFontSize(8);
    pdf.text('COLLECT ON DELIVERY', w / 2, y + 11, { align: 'center' });
  } else if (data.paymentStatus === 'partial') {
    pdf.setFillColor(240, 180, 0);
    pdf.rect(3, y, w - 6, statusH, 'F');
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('PARTIAL', 8, y + 5);
    pdf.setFontSize(16);
    pdf.text(`DUE: BDT ${data.amountDue.toLocaleString()}`, w - 8, y + 5, { align: 'right' });
    pdf.setFontSize(8);
    pdf.text('COLLECT REMAINING AMOUNT', w / 2, y + 11, { align: 'center' });
  } else {
    pdf.setFillColor(0, 150, 0);
    pdf.rect(3, y, w - 6, statusH, 'F');
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('PAID', w / 2, y + 9, { align: 'center' });
  }
  pdf.setTextColor(0);
  y += statusH + 5;

  // ── Barcode area ──
  if (data.barcode) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.barcode, w / 2, y + 3, { align: 'center' });
    y += 8;
    // Barcode lines (simple visual representation)
    const barcodeX = 15;
    const barcodeW = w - 30;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    for (let i = 0; i < 40; i++) {
      const x = barcodeX + (i * barcodeW / 40);
      const h = (i % 3 === 0) ? 10 : 8;
      pdf.line(x, y, x, y + h);
    }
    y += 12;
    pdf.setFontSize(8);
    pdf.text(data.orderNumber, w / 2, y, { align: 'center' });
  }

  return pdf.output('blob');
}
