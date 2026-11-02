export type LineItemInput = { description: string; quantity: number; unitPrice: number };

/** Shared by the server (authoritative) and the invoice editor (live preview). Amounts in paise. */
export function computeTotals(items: LineItemInput[], discount = 0, taxPercent = 0) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = Math.round((taxable * taxPercent) / 100);
  return { subtotal, taxAmount, total: taxable + taxAmount };
}
