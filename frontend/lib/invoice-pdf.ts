import jsPDF from 'jspdf';

export interface InvoiceOrder {
  id: string;
  date: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  shippingAddress?: string;
  items: {
    name: string;
    sku?: string;
    variant?: string;
    qty: number;
    price: number;
  }[];
  subtotal: number;
  shippingCost: number;
  tax?: number;
  discount: number;
  total: number;
  payment: string;
  paymentStatus: string;
  storeName?: string;
  /** Optional logo URL; embedded top-right if loadable. */
  storeLogoUrl?: string | null;
  /** Optional contact lines printed under the store name. */
  storeEmail?: string | null;
  storePhone?: string | null;
  storeAddress?: string | null;
  /** Individual payment transactions to show in payment history section. */
  payments?: { date: string; amount: number; method: string }[];
  /** Amount already paid — used to calculate due when no payment records exist. */
  amountPaid?: number;
}

/**
 * Tries to fetch an image URL and convert it to a data URL so jsPDF can
 * embed it. Returns null on any failure (CORS, 404, network) — caller
 * falls back to text-only branding.
 */
async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  // Try direct fetch first. Falls back to the same-origin proxy
  // (`/api/img-proxy`) when CORS blocks the request — Laravel's `artisan
  // serve` doesn't run middleware on /storage/* so logos hosted there
  // come back with no Access-Control-Allow-Origin header.
  const tryFetch = async (target: string): Promise<Blob | null> => {
    try {
      const res = await fetch(target, { mode: 'cors' });
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  };

  let blob = await tryFetch(url);
  if (!blob) {
    blob = await tryFetch(`/api/img-proxy?url=${encodeURIComponent(url)}`);
  }
  if (!blob) return null;

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob!);
    });
    const dim = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ...dim };
  } catch {
    return null;
  }
}

export async function generateInvoicePdf(order: InvoiceOrder): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helpers
  const addText = (text: string, x: number, currentY: number, opts?: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'right' | 'center' }) => {
    const { size = 10, bold = false, color = [50, 50, 50], align = 'left' } = opts || {};
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, currentY, { align });
  };

  const drawLine = (currentY: number, color: [number, number, number] = [220, 220, 220]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
  };

  // ── Header: INVOICE + order id (left), logo or store name + contact (right) ──
  const headerStartY = y;
  addText('INVOICE', margin, y, { size: 22, bold: true, color: [20, 20, 20] });
  y += 7;
  addText(order.id, margin, y, { size: 11, bold: true, color: [80, 80, 80] });

  // Right-side branding. Try to embed the logo first; fall back to bold
  // store name. Address / phone / email are stacked below either.
  const storeName = order.storeName || 'Store';
  let rightY = headerStartY;
  let logoEmbedded = false;
  if (order.storeLogoUrl) {
    const img = await loadImageAsDataUrl(order.storeLogoUrl);
    if (img) {
      const targetH = 14; // mm
      const ratio = img.width / img.height || 1;
      const targetW = Math.min(50, targetH * ratio);
      doc.addImage(img.dataUrl, 'PNG', pageWidth - margin - targetW, rightY - 2, targetW, targetH);
      rightY += targetH;
      logoEmbedded = true;
    }
  }
  if (!logoEmbedded) {
    addText(storeName, pageWidth - margin, rightY + 4, { size: 14, bold: true, color: [20, 20, 20], align: 'right' });
    rightY += 6;
  }
  // Contact lines — phone / email / address. Skip the ones the vendor
  // hasn't filled out so we don't show empty rows.
  const contactLines: string[] = [];
  if (order.storePhone) contactLines.push(order.storePhone);
  if (order.storeEmail) contactLines.push(order.storeEmail);
  if (order.storeAddress) contactLines.push(order.storeAddress);
  contactLines.forEach((line) => {
    addText(line, pageWidth - margin, rightY + 4, { size: 8, color: [110, 110, 110], align: 'right' });
    rightY += 4;
  });

  y = Math.max(y, rightY) + 4;
  drawLine(y);
  y += 8;

  // ── Invoice details ──
  addText('Invoice Number:', margin, y, { size: 9, color: [120, 120, 120] });
  const rawId = order.id.replace('#', '');
  const invoiceNum = /^\d+$/.test(rawId) ? rawId.padStart(7, '0') : rawId;
  addText(`INV-${invoiceNum}`, margin + 32, y, { size: 9, bold: true });

  addText('Date:', pageWidth - margin - 40, y, { size: 9, color: [120, 120, 120] });
  addText(order.date, pageWidth - margin, y, { size: 9, align: 'right' });

  y += 12;

  // ── Bill To / Ship To ──
  const midX = pageWidth / 2 + 5;

  addText('BILL TO', margin, y, { size: 8, bold: true, color: [100, 100, 100] });
  addText('SHIP TO', midX, y, { size: 8, bold: true, color: [100, 100, 100] });
  y += 5;

  addText(order.customer.name, margin, y, { size: 10, bold: true, color: [30, 30, 30] });
  addText(order.customer.name, midX, y, { size: 10, bold: true, color: [30, 30, 30] });
  y += 5;

  // Wrap address text
  const billAddress = order.customer.address;
  const shipAddress = order.shippingAddress || order.customer.address;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const billLines = doc.splitTextToSize(billAddress, contentWidth / 2 - 10);
  const shipLines = doc.splitTextToSize(shipAddress, contentWidth / 2 - 10);

  billLines.forEach((line: string, i: number) => {
    addText(line, margin, y + i * 4, { size: 9, color: [80, 80, 80] });
  });
  shipLines.forEach((line: string, i: number) => {
    addText(line, midX, y + i * 4, { size: 9, color: [80, 80, 80] });
  });

  y += Math.max(billLines.length, shipLines.length) * 4 + 2;
  addText(`Phone: ${order.customer.phone}`, margin, y, { size: 9, color: [80, 80, 80] });

  y += 12;

  // ── Items table ──
  // Table header
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y - 3, contentWidth, 8, 1, 1, 'F');

  const col1 = margin + 3;
  const col2 = pageWidth - margin - 65;
  const col3 = pageWidth - margin - 42;
  const col4 = pageWidth - margin - 18;

  addText('Product', col1, y + 2, { size: 8, bold: true, color: [100, 100, 100] });
  addText('Qty', col2, y + 2, { size: 8, bold: true, color: [100, 100, 100], align: 'center' });
  addText('Unit Price', col3, y + 2, { size: 8, bold: true, color: [100, 100, 100], align: 'right' });
  addText('Total', pageWidth - margin - 3, y + 2, { size: 8, bold: true, color: [100, 100, 100], align: 'right' });

  y += 10;

  // Table rows
  order.items.forEach((item) => {
    const itemTotal = item.price * item.qty;
    const displayName = item.variant ? `${item.name} (${item.variant})` : item.name;

    addText(displayName, col1, y, { size: 9, color: [40, 40, 40] });
    addText(String(item.qty), col2, y, { size: 9, color: [60, 60, 60], align: 'center' });
    addText(`${item.price.toLocaleString()}`, col3, y, { size: 9, color: [60, 60, 60], align: 'right' });
    addText(`${itemTotal.toLocaleString()}`, pageWidth - margin - 3, y, { size: 9, bold: true, color: [40, 40, 40], align: 'right' });

    if (item.sku) {
      y += 4;
      addText(`SKU: ${item.sku}`, col1, y, { size: 7, color: [150, 150, 150] });
    }

    y += 7;
    drawLine(y - 2, [240, 240, 240]);
  });

  y += 4;

  // ── Totals ──
  const totalsX = pageWidth - margin - 60;
  const totalsValX = pageWidth - margin - 3;

  const addTotalLine = (label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number] }) => {
    addText(label, totalsX, y, { size: 9, color: opts?.color || [100, 100, 100] });
    addText(value, totalsValX, y, { size: 9, bold: opts?.bold, color: opts?.color || [50, 50, 50], align: 'right' });
    y += 5.5;
  };

  addTotalLine('Subtotal', `BDT ${order.subtotal.toLocaleString()}`);
  addTotalLine('Shipping', `BDT ${order.shippingCost.toLocaleString()}`);

  if (order.tax && order.tax > 0) {
    addTotalLine('Tax', `BDT ${order.tax.toLocaleString()}`);
  }

  if (order.discount > 0) {
    addTotalLine('Discount', `-BDT ${order.discount.toLocaleString()}`, { color: [34, 139, 34] });
  }

  y += 2;
  drawLine(y, [180, 180, 180]);
  y += 6;

  addText('Grand Total', totalsX, y, { size: 11, bold: true, color: [20, 20, 20] });
  addText(`BDT ${order.total.toLocaleString()}`, totalsValX, y, { size: 11, bold: true, color: [20, 20, 20], align: 'right' });

  y += 12;

  // ── Payment info ──
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, y - 3, contentWidth, 10, 1, 1, 'F');

  addText('Payment Method:', margin + 4, y + 2, { size: 8, color: [100, 100, 100] });
  addText(order.payment, margin + 38, y + 2, { size: 8, bold: true, color: [40, 40, 40] });

  addText('Status:', pageWidth - margin - 40, y + 2, { size: 8, color: [100, 100, 100] });
  const statusColor: [number, number, number] = order.paymentStatus === 'paid' ? [34, 139, 34] : [200, 100, 0];
  addText(order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1), pageWidth - margin - 4, y + 2, { size: 8, bold: true, color: statusColor, align: 'right' });

  y += 14;

  // ── Payment history ──
  if (order.payments && order.payments.length > 0) {
    addText('PAYMENT HISTORY', margin, y, { size: 8, bold: true, color: [100, 100, 100] });
    y += 5;

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y - 3, contentWidth, 7, 1, 1, 'F');
    addText('Date', margin + 3, y + 1.5, { size: 7, bold: true, color: [100, 100, 100] });
    addText('Method', margin + 55, y + 1.5, { size: 7, bold: true, color: [100, 100, 100] });
    addText('Amount', pageWidth - margin - 3, y + 1.5, { size: 7, bold: true, color: [100, 100, 100], align: 'right' });
    y += 8;

    let totalRecorded = 0;
    order.payments.forEach((p, idx) => {
      if (idx > 0) drawLine(y - 1, [240, 240, 240]);
      const pDate = new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      addText(pDate, margin + 3, y, { size: 8, color: [60, 60, 60] });
      addText(p.method.charAt(0).toUpperCase() + p.method.slice(1), margin + 55, y, { size: 8, color: [60, 60, 60] });
      addText(`BDT ${p.amount.toLocaleString()}`, pageWidth - margin - 3, y, { size: 8, bold: true, color: [40, 40, 40], align: 'right' });
      totalRecorded += p.amount;
      y += 6;
    });

    drawLine(y, [180, 180, 180]);
    y += 5;
    addText('Total Paid', margin + 3, y, { size: 8, bold: true, color: [20, 20, 20] });
    addText(`BDT ${totalRecorded.toLocaleString()}`, pageWidth - margin - 3, y, { size: 8, bold: true, color: [34, 139, 34], align: 'right' });

    y += 10;
  } else {
    y += 6;
  }

  // ── Due amount — always show when not fully paid ──
  const totalPaid = order.amountPaid ?? (order.payments?.reduce((s, p) => s + p.amount, 0) ?? 0);
  const due = order.total - totalPaid;
  if (due > 0.01) {
    doc.setFillColor(255, 247, 237);
    doc.roundedRect(margin, y - 3, contentWidth, 10, 1, 1, 'F');
    addText('Due Amount', margin + 4, y + 2, { size: 9, bold: true, color: [180, 80, 0] });
    addText(`BDT ${due.toLocaleString()}`, pageWidth - margin - 3, y + 2, { size: 9, bold: true, color: [180, 80, 0], align: 'right' });
    y += 14;
  }

  // ── Footer ──
  drawLine(y, [230, 230, 230]);
  y += 6;
  addText('Thank you for your business!', pageWidth / 2, y, { size: 10, bold: true, color: [80, 80, 80], align: 'center' });
  y += 5;
  addText(`Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth / 2, y, { size: 7, color: [160, 160, 160], align: 'center' });

  return doc.output('blob');
}
