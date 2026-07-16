// Driver earnings / COD history for the shift (live from /api/driver/me/summary).
//  - Hero shows cash still IN HAND (what the driver owes the cashier).
//  - Two stats: collected today vs already handed over.
//  - A list of today's deliveries with a settled/carrying badge.
import 'package:flutter/material.dart';
import '../theme.dart';
import '../i18n.dart';
import '../services/api_client.dart';

class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key, required this.token});
  final String token;
  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await DriverApi(widget.token).mySummary();
      if (mounted) setState(() { _data = d; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = _data;
    final orders = (d?['orders'] as List?) ?? [];
    return Scaffold(
      appBar: AppBar(title: Text('${tr('myCash')} · العهدة'),
        backgroundColor: Colors.transparent, elevation: 0),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(18),
                children: [
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(gradient: MeshwarColors.brandGradient, borderRadius: BorderRadius.circular(20)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(tr('cashInHand'),
                        style: TextStyle(color: Colors.white.withOpacity(.85), fontSize: 12, letterSpacing: .5)),
                      const SizedBox(height: 8),
                      Text('${d?['inHandEGP'] ?? '0.00'} EGP',
                        style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w800)),
                      Text(tr('deliveriesToday', vars: {'n': '${d?['deliveries'] ?? 0}'}),
                        style: TextStyle(color: Colors.white.withOpacity(.85), fontSize: 12)),
                    ]),
                  ),
                  const SizedBox(height: 14),
                  Row(children: [
                    Expanded(child: _stat(tr('collectedToday'), '${d?['collectedEGP'] ?? '0.00'} EGP', MeshwarColors.ink)),
                    const SizedBox(width: 12),
                    Expanded(child: _stat(tr('handedOver'), '${d?['handedOverEGP'] ?? '0.00'} EGP', MeshwarColors.ok)),
                  ]),
                  const SizedBox(height: 20),
                  Text(tr('todaysDeliveries'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 10),
                  ...orders.map((o) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: MeshwarCard(
                      child: Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${o['address']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                          Text('${o['amountEGP']} EGP', style: const TextStyle(color: MeshwarColors.muted, fontSize: 13)),
                        ])),
                        _badge(o['settled'] == true),
                      ]),
                    ),
                  )),
                ],
              ),
            ),
    );
  }

  Widget _stat(String label, String value, Color color) => MeshwarCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: MeshwarColors.muted, fontSize: 12)),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: color)),
        ]),
      );

  Widget _badge(bool settled) {
    final bg = settled ? const Color(0xFFE7F7F1) : const Color(0xFFFDECEE);
    final fg = settled ? MeshwarColors.ok : MeshwarColors.danger;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(settled ? tr('handedOverBadge') : tr('carrying'),
        style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 11)),
    );
  }
}
