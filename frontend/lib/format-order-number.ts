/**
 * Format an order number for display.
 * Purely numeric order numbers are zero-padded to 7 digits
 * (e.g. "1" → "0000001", "26" → "0000026").
 * Legacy ORD-XXXX formats are returned as-is.
 */
export function formatOrderNumber(orderNumber: string | null | undefined): string {
  if (!orderNumber) return '';
  return /^\d+$/.test(orderNumber) ? orderNumber.padStart(7, '0') : orderNumber;
}
