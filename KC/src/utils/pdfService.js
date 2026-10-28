import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { buildInvoiceHtml } from './invoiceHtml';
import { buildReportHtml } from './reportHtml';

/**
 * The installed react-native-html-to-pdf (1.3.0) is a TurboModule rewrite —
 * it exports only the named `generatePDF(options)` function, no default
 * export and no `.convert()` method. Importing it as a default (the old
 * pre-rewrite API) silently yields `undefined`, so calling `.convert` on it
 * throws "Cannot read property 'convert' of undefined". Always call
 * `generatePDF` directly, never reintroduce the old `RNHTMLtoPDF.convert(...)` shape.
 */
async function renderPdf(html, fileName) {
  const file = await generatePDF({ html, fileName, base64: false });
  if (!file?.filePath) {
    throw new Error('PDF generation failed — no file was produced.');
  }
  return file.filePath;
}

/**
 * Generates a real PDF for the given invoice (backend /invoices/{id}/print
 * payload, same shape the webapp's PrintPreviewModal consumes) and hands it
 * to the platform's own share/save sheet — the Android equivalent of the
 * webapp's browser "Save as PDF" dialog. Throws on failure; callers must
 * surface the real error, never a fake success.
 */
export async function downloadInvoicePdf(printData) {
  const html = buildInvoiceHtml(printData);
  const fileName = `invoice_${printData.invoice.invoice_no || printData.invoice.id}`;
  const filePath = await renderPdf(html, fileName);
  await Share.open({ url: `file://${filePath}`, type: 'application/pdf', failOnCancel: false });
  return filePath;
}

/**
 * Generates a real PDF for any report {title, filtersText, columns, rows,
 * totalsRow} — used by every report's "Export PDF" / "Export Selected PDF".
 */
export async function downloadReportPdf(reportData, fileName) {
  const html = buildReportHtml(reportData);
  const filePath = await renderPdf(html, fileName);
  await Share.open({ url: `file://${filePath}`, type: 'application/pdf', failOnCancel: false });
  return filePath;
}
