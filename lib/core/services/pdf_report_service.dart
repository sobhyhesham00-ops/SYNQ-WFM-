import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../features/dashboard/financial_summary.dart';

/// Generates the premium monthly PDF financial report.
class PdfReportService {
  PdfReportService._();

  static Future<void> generateAndShare({
    required String shopName,
    required String monthLabel,
    required FinancialSummary summary,
    required bool isArabic,
  }) async {
    final doc = pw.Document();
    final font = await PdfGoogleFonts.cairoRegular();
    final bold = await PdfGoogleFonts.cairoBold();
    final td = isArabic ? pw.TextDirection.rtl : pw.TextDirection.ltr;

    String money(num v) => '${v.toStringAsFixed(0)} ${isArabic ? 'ج.م' : 'EGP'}';
    final t = isArabic ? _ar : _en;

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        textDirection: td,
        theme: pw.ThemeData.withFont(base: font, bold: bold),
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.stretch,
          children: [
            pw.Container(
              padding: const pw.EdgeInsets.all(20),
              decoration: const pw.BoxDecoration(
                color: PdfColor.fromInt(0xFF6C4DFF),
                borderRadius:
                    pw.BorderRadius.all(pw.Radius.circular(16)),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(shopName.isEmpty ? t['app']! : shopName,
                      style: pw.TextStyle(
                          color: PdfColors.white,
                          fontSize: 22,
                          fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 4),
                  pw.Text('${t['report']!} · $monthLabel',
                      style: const pw.TextStyle(
                          color: PdfColors.white, fontSize: 13)),
                ],
              ),
            ),
            pw.SizedBox(height: 24),
            _row(t['revenue']!, money(summary.productRevenue)),
            _row(t['stock']!, '- ${money(summary.stockCost)}'),
            _row(t['bills']!, '- ${money(summary.bills)}'),
            _row(t['commission']!, '+ ${money(summary.serviceCommission)}'),
            pw.Divider(),
            _row(t['net']!, money(summary.netProfit), highlight: true),
            pw.SizedBox(height: 24),
            pw.Text(t['sep']!,
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 8),
            _row(t['turnover']!, money(summary.productRevenue)),
            _row(t['service_gross']!, money(summary.serviceGross)),
            _row(t['sales_count']!, '${summary.salesCount}'),
            pw.Spacer(),
            pw.Text('Dargak · درجك',
                style:
                    const pw.TextStyle(color: PdfColors.grey, fontSize: 10)),
          ],
        ),
      ),
    );

    await Printing.sharePdf(
      bytes: await doc.save(),
      filename: 'dargak_report_$monthLabel.pdf',
    );
  }

  static pw.Widget _row(String label, String value, {bool highlight = false}) {
    final style = pw.TextStyle(
      fontSize: highlight ? 18 : 13,
      fontWeight: highlight ? pw.FontWeight.bold : pw.FontWeight.normal,
      color: highlight ? const PdfColor.fromInt(0xFF16C784) : PdfColors.black,
    );
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 6),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [pw.Text(label, style: style), pw.Text(value, style: style)],
      ),
    );
  }

  static const _en = {
    'app': 'Dargak',
    'report': 'Monthly Financial Report',
    'revenue': 'Product Revenue',
    'stock': 'Cost of Stock',
    'bills': 'Bills & Rent',
    'commission': 'Service Commission',
    'net': 'Net Profit',
    'sep': 'Product vs Service breakdown',
    'turnover': 'Product Turnover',
    'service_gross': 'Service Throughput (gross)',
    'sales_count': 'Number of sales',
  };

  static const _ar = {
    'app': 'درجك',
    'report': 'التقرير المالي الشهري',
    'revenue': 'مبيعات البضاعة',
    'stock': 'تكلفة البضاعة',
    'bills': 'فواتير وإيجار',
    'commission': 'عمولة الخدمات',
    'net': 'صافي الربح',
    'sep': 'الفصل بين البضاعة والخدمات',
    'turnover': 'حركة البضاعة',
    'service_gross': 'إجمالي حركة الخدمات',
    'sales_count': 'عدد المبيعات',
  };
}
