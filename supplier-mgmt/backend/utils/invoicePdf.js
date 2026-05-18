import puppeteer from 'puppeteer';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const fmtMoney = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const paymentStatusLabel = (status) => {
  const map = {
    draft: 'Draft',
    generated: 'Generated',
    sent: 'Sent',
    paid: 'Paid',
    partially_paid: 'Partially Paid',
    pending: 'Pending',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
};

const companyDetailsHtml = (company) => {
  if (!company) return '<p>—</p>';
  return `
    <p><strong>${company.companyName}</strong></p>
    ${company.contactPerson ? `<p>${company.contactPerson}</p>` : ''}
    ${company.billingAddress ? `<p>${company.billingAddress}</p>` : ''}
    ${company.mobile ? `<p>Mobile: ${company.mobile}</p>` : ''}
    ${company.email ? `<p>Email: ${company.email}</p>` : ''}
    ${company.gstNumber ? `<p>GST: ${company.gstNumber}</p>` : ''}
  `;
};

const buildInvoiceHtml = (data) => {
  const { invoice, company, issuerCompany, items } = data;
  const taxable =
    Number(invoice.totalAmount) + Number(invoice.extraCharges) - Number(invoice.discount);

  const rows = items
    .map(
      (item, i) => `
    <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
      <td>${i + 1}</td>
      <td>${fmtDate(item.lineDate)}</td>
      <td>${item.jobTypeName}</td>
      <td>${item.vehicleNumber || '—'}</td>
      <td>${item.driverName || '—'}</td>
      <td class="num">${item.actualTrips}</td>
      <td class="num">${fmtMoney(item.ratePerTrip)}</td>
      <td class="num">${fmtMoney(item.amount)}</td>
    </tr>`
    )
    .join('');

  const paidTotal = (invoice.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const payBadge =
    invoice.paymentStatus === 'paid'
      ? 'paid'
      : invoice.paymentStatus === 'partially_paid'
        ? 'partial'
        : 'pending';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .tax-title { font-size: 22px; font-weight: bold; text-align: right; color: #0f172a; }
    .meta { text-align: right; margin-top: 8px; font-size: 11px; color: #475569; }
    .parties { display: flex; gap: 16px; margin-bottom: 16px; }
    .parties .box { flex: 1; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #f8fafc; }
    .box h3 { font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .period { margin-bottom: 16px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1e293b; color: #fff; padding: 8px 6px; text-align: left; font-size: 9px; }
    td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9px; }
    tr.even { background: #f8fafc; }
    tr.odd { background: #fff; }
    .num { text-align: right; }
    .totals { width: 280px; margin-left: auto; }
    .totals table { margin: 0; }
    .totals td { border: none; padding: 4px 0; }
    .totals .label { text-align: right; padding-right: 12px; color: #475569; }
    .totals .value { text-align: right; font-weight: 600; }
    .grand { font-size: 14px; font-weight: bold; color: #0f172a; border-top: 2px solid #1e293b !important; padding-top: 8px !important; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 11px; margin: 16px 0; }
    .badge.paid { background: #dcfce7; color: #166534; }
    .badge.partial { background: #fef9c3; color: #854d0e; }
    .badge.pending { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 10px; }
    .footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="tax-title" style="text-align:left;font-size:18px;">TAX INVOICE</div>
    <div>
      <div class="meta">
        <div><strong>Invoice No:</strong> ${invoice.invoiceNumber}</div>
        <div><strong>Date:</strong> ${fmtDate(invoice.invoiceDate)}</div>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="box">
      <h3>Bill From</h3>
      ${companyDetailsHtml(issuerCompany)}
    </div>
    <div class="box">
      <h3>Bill To</h3>
      ${companyDetailsHtml(company)}
    </div>
  </div>

  <p class="period">
    <strong>Billing Period:</strong>
    ${fmtDate(invoice.billingPeriodFrom)} — ${fmtDate(invoice.billingPeriodTo)}
  </p>

  <table>
    <thead>
      <tr>
        <th>Sr.</th>
        <th>Date</th>
        <th>Job Type</th>
        <th>Vehicle No.</th>
        <th>Driver</th>
        <th>Trips</th>
        <th>Rate (Rs.)</th>
        <th>Amount (Rs.)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td class="label">Sub Total:</td><td class="value">${fmtMoney(invoice.totalAmount)}</td></tr>
      <tr><td class="label">Extra Charges:</td><td class="value">${fmtMoney(invoice.extraCharges)}</td></tr>
      <tr><td class="label">Discount${invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ''}:</td><td class="value">-${fmtMoney(invoice.discount)}</td></tr>
      <tr><td class="label">Taxable Amount:</td><td class="value">${fmtMoney(taxable)}</td></tr>
      <tr><td class="label">CGST (${invoice.cgstRate || 0}%):</td><td class="value">${fmtMoney(invoice.cgstAmount)}</td></tr>
      <tr><td class="label">SGST (${invoice.sgstRate || 0}%):</td><td class="value">${fmtMoney(invoice.sgstAmount)}</td></tr>
      <tr class="grand"><td class="label">GRAND TOTAL:</td><td class="value">${fmtMoney(invoice.grandTotal)}</td></tr>
    </table>
  </div>

  <span class="badge ${payBadge}">Payment Status: ${paymentStatusLabel(invoice.paymentStatus)}</span>
  ${paidTotal > 0 ? `<p style="font-size:10px;color:#475569;">Amount received: ${fmtMoney(paidTotal)}</p>` : ''}

  <div class="footer">
    <p><strong>Thank you for your business.</strong></p>
    ${company.paymentTerms ? `<p>Payment Terms: ${company.paymentTerms}</p>` : ''}
    <p>This is a computer-generated invoice.</p>
  </div>
</body>
</html>`;
};

export const generateInvoicePdf = async (invoiceData) => {
  const html = buildInvoiceHtml(invoiceData);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
    return pdf;
  } finally {
    await browser.close();
  }
};
