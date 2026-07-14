// Driver earnings / COD history for the shift.
//  - Hero shows cash still IN HAND (what the driver owes the cashier).
//  - Two stats: collected today vs already handed over.
//  - A list of today's deliveries with a settled/carrying badge.
// Live data comes from GET /api/driver/me/summary; demo values shown here.
import 'package:flutter/material.dart';
import '../theme.dart';

class EarningsScreen extends StatelessWidget {
  const EarningsScreen({super.key});

  // Demo shift data (shape matches /api/driver/me/summary).
  static const _inHand = '205.00';
  static const _collected = '410.00';
  static const _handedOver = '205.00';
  static const _orders = [
    ('12 Sherif St, Downtown', '125.00', true),
    ('8 Talaat Harb Sq', '80.00', true),
    ('30 Kasr El Nil St', '205.00', false),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My cash · العهدة'),
        backgroundColor: Colors.transparent, elevation: 0),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            // Hero: cash in hand
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(gradient: MeshwarColors.brandGradient, borderRadius: BorderRadius.circular(20)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('CASH IN HAND (OWED TO CASHIER)',
                  style: TextStyle(color: Colors.white.withOpacity(.85), fontSize: 12, letterSpacing: .5)),
                const SizedBox(height: 8),
                const Text('$_inHand EGP',
                  style: TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w800)),
                Text('${_orders.length} deliveries today',
                  style: TextStyle(color: Colors.white.withOpacity(.85), fontSize: 12)),
              ]),
            ),
            const SizedBox(height: 14),

            Row(children: [
              Expanded(child: _stat('Collected today', '$_collected EGP', MeshwarColors.ink)),
              const SizedBox(width: 12),
              Expanded(child: _stat('Handed over', '$_handedOver EGP', MeshwarColors.ok)),
            ]),
            const SizedBox(height: 20),

            const Text("Today's deliveries", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 10),
            ..._orders.map((o) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: MeshwarCard(
                child: Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(o.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text('${o.$2} EGP', style: const TextStyle(color: MeshwarColors.muted, fontSize: 13)),
                  ])),
                  _badge(o.$3),
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
      child: Text(settled ? 'Handed over' : 'Carrying',
        style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 11)),
    );
  }
}
