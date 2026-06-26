import jsPDF from 'jspdf';

interface POLineItem {
  name: string;
  variantName?: string;
  supplierSku: string;
  quantity: number;
  cost: number;
  taxPercent: number;
  total: number;
}

interface CostAdjustment {
  label: string;
  amount: number;
}

interface POExportData {
  poNumber: string;
  status: string;
  supplier: string;
  destination: string;
  paymentTerms: string;
  currency: string;
  currencySymbol: string;
  arrivalDate: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  lineItems: POLineItem[];
  costAdjustments: CostAdjustment[];
  referenceNumber: string;
  supplierNote: string;
  tags: string;
  subtotal: number;
  taxes: number;
  adjustmentsTotal: number;
  total: number;
  totalItems: number;
}

export function exportPurchaseOrderPDF(data: POExportData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 15;

  const sym = data.currencySymbol;

  // ── Header ──────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', marginL, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(data.poNumber, marginL + contentW, y, { align: 'right' });
  y += 5;

  doc.setFontSize(8);
  doc.text(`Status: ${data.status}`, marginL + contentW, y, { align: 'right' });
  doc.setTextColor(0);
  y += 10;

  // ── Supplier & Destination ──────────────────────────────
  doc.setFillColor(248, 248, 248);
  doc.rect(marginL, y, contentW, 22, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Supplier', marginL + 4, y + 5);
  doc.text('Destination', marginL + contentW / 2 + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.supplier || 'Not set', marginL + 4, y + 12);
  doc.text(data.destination || 'Not set', marginL + contentW / 2 + 4, y + 12);

  if (data.paymentTerms && data.paymentTerms !== 'None') {
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`Payment: ${data.paymentTerms}`, marginL + 4, y + 18);
    doc.setTextColor(0);
  }
  y += 28;

  // ── Shipment details ────────────────────────────────────
  if (data.arrivalDate || data.carrier || data.trackingNumber) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Shipment Details', marginL, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const shipDetails: string[] = [];
    if (data.arrivalDate) shipDetails.push(`Arrival: ${data.arrivalDate}`);
    if (data.carrier) shipDetails.push(`Carrier: ${data.carrier}`);
    if (data.trackingNumber) shipDetails.push(`Tracking: ${data.trackingNumber}`);
    doc.text(shipDetails.join('   |   '), marginL, y);
    y += 8;
  }

  // ── Products table ──────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Products', marginL, y);
  y += 5;

  // Table header
  const colX = {
    product: marginL,
    sku: marginL + 70,
    qty: marginL + 105,
    cost: marginL + 125,
    tax: marginL + 150,
    total: marginL + contentW,
  };

  doc.setFillColor(240, 240, 240);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Product', colX.product + 2, y + 5);
  doc.text('Supplier SKU', colX.sku, y + 5);
  doc.text('Qty', colX.qty, y + 5);
  doc.text('Cost', colX.cost, y + 5);
  doc.text('Tax', colX.tax, y + 5);
  doc.text('Total', colX.total, y + 5, { align: 'right' });
  y += 9;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (const item of data.lineItems) {
    if (y > 260) {
      doc.addPage();
      y = 15;
    }

    const displayName = item.variantName
      ? `${item.name} - ${item.variantName}`
      : item.name;

    // Truncate long names
    const maxNameW = colX.sku - colX.product - 4;
    const truncated = doc.getTextWidth(displayName) > maxNameW
      ? displayName.substring(0, 35) + '...'
      : displayName;

    doc.text(truncated, colX.product + 2, y);
    doc.text(item.supplierSku || '-', colX.sku, y);
    doc.text(String(item.quantity), colX.qty, y);
    doc.text(`${sym}${item.cost.toFixed(2)}`, colX.cost, y);
    doc.text(`${item.taxPercent}%`, colX.tax, y);
    doc.text(`${sym}${item.total.toFixed(2)}`, colX.total, y, { align: 'right' });

    // Light divider
    doc.setDrawColor(230);
    doc.line(marginL, y + 2, marginL + contentW, y + 2);
    y += 7;
  }

  if (data.lineItems.length === 0) {
    doc.setTextColor(150);
    doc.text('No products added', marginL + 2, y);
    doc.setTextColor(0);
    y += 7;
  }

  y += 3;

  // ── Cost summary ────────────────────────────────────────
  const summaryX = marginL + contentW / 2;
  const summaryW = contentW / 2;

  doc.setFillColor(248, 248, 248);
  doc.rect(summaryX, y, summaryW, 40 + data.costAdjustments.length * 6, 'F');

  let sy = y + 5;
  doc.setFontSize(8);

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', summaryX + 4, sy);
  doc.text(`${sym}${data.subtotal.toFixed(2)}`, summaryX + summaryW - 4, sy, { align: 'right' });
  sy += 6;

  doc.text('Taxes (included)', summaryX + 4, sy);
  doc.text(`${sym}${data.taxes.toFixed(2)}`, summaryX + summaryW - 4, sy, { align: 'right' });
  sy += 6;

  doc.setTextColor(100);
  doc.text(`${data.totalItems} item(s)`, summaryX + 4, sy);
  doc.setTextColor(0);
  sy += 6;

  // Cost adjustments
  if (data.costAdjustments.length > 0) {
    doc.setDrawColor(220);
    doc.line(summaryX + 4, sy, summaryX + summaryW - 4, sy);
    sy += 4;
    for (const adj of data.costAdjustments) {
      doc.text(adj.label, summaryX + 4, sy);
      doc.text(`${sym}${adj.amount.toFixed(2)}`, summaryX + summaryW - 4, sy, { align: 'right' });
      sy += 6;
    }
  }

  // Total
  doc.setDrawColor(200);
  doc.line(summaryX + 4, sy, summaryX + summaryW - 4, sy);
  sy += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total', summaryX + 4, sy);
  doc.text(`${sym}${data.total.toFixed(2)}`, summaryX + summaryW - 4, sy, { align: 'right' });

  // ── Additional details (left side) ──────────────────────
  let ay = y;
  const addW = contentW / 2 - 5;

  if (data.referenceNumber) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Reference number', marginL, ay);
    ay += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(data.referenceNumber, marginL, ay);
    ay += 6;
  }

  if (data.supplierNote) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Note to supplier', marginL, ay);
    ay += 4;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(data.supplierNote, addW);
    doc.text(noteLines, marginL, ay);
    ay += noteLines.length * 3.5 + 4;
  }

  if (data.tags) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Tags', marginL, ay);
    ay += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(data.tags, marginL, ay);
  }

  // ── Footer ──────────────────────────────────────────────
  const footerY = 285;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, marginL, footerY);
  doc.text('eTommerce.com', marginL + contentW, footerY, { align: 'right' });

  // Save
  doc.save(`${data.poNumber || 'purchase-order'}.pdf`);
}
