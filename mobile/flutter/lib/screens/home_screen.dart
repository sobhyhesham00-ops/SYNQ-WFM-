// Driver home — fintech-styled: gradient "cash to hand over" hero, shift toggle,
// and today's order cards.  (Design mirrors the shared reference.)
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../theme.dart';
import '../services/location_service.dart';
import '../services/api_client.dart';
import 'delivery_screen.dart';

// In the real app base URL + JWT come from config + secure storage (set at login).
const _apiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://api.meshwar.app');
const _driverToken = String.fromEnvironment('DRIVER_TOKEN', defaultValue: '');

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.driverName});
  final String driverName;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _onShift = false;

  // In the real app these come from GET /api/state filtered to this driver.
  final _orders = const [
    ('30 Kasr El Nil St', 200.0, 'PickedUp'),
    ('12 Sherif St, Downtown', 125.0, 'Delivered'),
    ('8 Talaat Harb Sq', 80.0, 'Delivered'),
  ];

  double get _toHandOver => _orders
      .where((o) => o.$3 == 'Delivered')
      .fold(0.0, (s, o) => s + o.$2);

  Future<void> _ensurePermissions() async {
    await Permission.locationWhenInUse.request();
    await Permission.locationAlways.request();
    await Permission.notification.request();
    await Permission.ignoreBatteryOptimizations.request();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(children: [
                  Container(width: 30, height: 30,
                    decoration: BoxDecoration(gradient: MeshwarColors.brandGradient,
                      borderRadius: BorderRadius.circular(9))),
                  const SizedBox(width: 10),
                  const Text('Meshwar', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
                  const SizedBox(width: 6),
                  const Text('مشوار', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: MeshwarColors.muted)),
                ]),
                CircleAvatar(backgroundColor: Colors.white,
                  child: Text(widget.driverName.characters.first,
                    style: const TextStyle(color: MeshwarColors.brand, fontWeight: FontWeight.w700))),
              ],
            ),
            const SizedBox(height: 18),

            // Hero: cash to hand over to cashier.
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: MeshwarColors.brandGradient,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('CASH TO HAND OVER',
                    style: TextStyle(color: Colors.white.withOpacity(.85), fontSize: 12, letterSpacing: .5)),
                  const SizedBox(height: 8),
                  Text('${_toHandOver.toStringAsFixed(2)} EGP',
                    style: const TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.w800)),
                  Text('${_orders.where((o) => o.$3 == 'Delivered').length} delivered today',
                    style: TextStyle(color: Colors.white.withOpacity(.85), fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Shift toggle.
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: _onShift ? MeshwarColors.danger : null,
              ),
              onPressed: () async {
                if (!_onShift) { await _ensurePermissions(); await startShift(); }
                else { endShift(); }
                setState(() => _onShift = !_onShift);
              },
              child: Text(_onShift ? 'إنهاء الوردية · End shift' : 'بدء الوردية · Start shift'),
            ),
            if (_onShift)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.circle, color: MeshwarColors.ok, size: 10),
                  const SizedBox(width: 6),
                  Text('Location sharing on', style: TextStyle(color: MeshwarColors.muted, fontSize: 12)),
                ]),
              ),
            const SizedBox(height: 20),

            const Text('My orders', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 10),
            ..._orders.asMap().entries.map((e) {
              final i = e.key;
              final o = e.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: o.$3 == 'Delivered' ? null : () async {
                    await Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => DeliveryScreen(
                        api: OrderApi(_apiBase, _driverToken),
                        orderId: 'demo-order-$i',
                        address: o.$1,
                        cashEGP: o.$2,
                        initialStatus: o.$3,
                      ),
                    ));
                  },
                  child: MeshwarCard(
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(o.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text('${o.$2.toStringAsFixed(0)} EGP',
                          style: const TextStyle(color: MeshwarColors.muted, fontSize: 13)),
                      ])),
                      _StatusChip(o.$3),
                      if (o.$3 != 'Delivered')
                        const Padding(padding: EdgeInsets.only(left: 6),
                          child: Icon(Icons.chevron_right, color: MeshwarColors.muted)),
                    ]),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip(this.status);
  final String status;
  @override
  Widget build(BuildContext context) {
    final bg = status == 'Delivered' ? const Color(0xFFE7F7F1)
        : status == 'PickedUp' ? const Color(0xFFEDE9FF) : const Color(0xFFFDECEE);
    final fg = status == 'Delivered' ? MeshwarColors.ok
        : status == 'PickedUp' ? MeshwarColors.brand : MeshwarColors.danger;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(status, style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 11)),
    );
  }
}
