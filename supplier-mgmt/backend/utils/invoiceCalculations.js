export const calculateInvoiceTotals = ({
  subtotal,
  extraCharges = 0,
  discountPercent = 0,
  cgstRate = 0,
  sgstRate = 0,
}) => {
  const sub = Number(subtotal) || 0;
  const extra = Number(extraCharges) || 0;
  const discPct = Number(discountPercent) || 0;
  const cgstPct = Number(cgstRate) || 0;
  const sgstPct = Number(sgstRate) || 0;

  const discountAmount = (sub * discPct) / 100;
  const taxableAmount = sub + extra - discountAmount;
  const cgstAmount = (taxableAmount * cgstPct) / 100;
  const sgstAmount = (taxableAmount * sgstPct) / 100;
  const taxAmount = cgstAmount + sgstAmount;
  const grandTotal = taxableAmount + taxAmount;

  return {
    totalAmount: Number(sub.toFixed(2)),
    discount: Number(discountAmount.toFixed(2)),
    discountPercent: discPct,
    extraCharges: Number(extra.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    cgstRate: cgstPct,
    sgstRate: sgstPct,
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(2)),
    taxRate: Number((cgstPct + sgstPct).toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
};
