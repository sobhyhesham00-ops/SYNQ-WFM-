// Driver home — fintech-styled: gradient "cash to hand over" hero, shift toggle,
// and today's live orders (loaded from the backend).
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import '../theme.dart';
import '../services/location_service.dart';
import '../services/api_client.dart';
import '../i18n.dart';
import 'delivery_screen.dart';
import 'earnings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.token, required this.driverName});
  final String token;
  final String driverName;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  late final DriverApi _api = DriverApi(widget.token);
  bool _onShift = false;
  List<DriverOrder> _orders = [];
  bool _loading = true;

  // Poll the order list while the screen is in the foreground so a driver sees
  // a fresh assignment without pulling to refresh. Paused while backgrounded to
  // save battery/data. `_knownIds` lets us announce only genuinely new orders.
  static const _pollEvery = Duration(seconds: 25);
  Timer? _poll;
  final Set<String> _knownIds = {};
  bool _seeded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _startPolling();
  }

  @override
  void dispose() {
    _poll?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _load(announce: true); // catch anything that landed while backgrounded
      _startPolling();
    } else {
      _poll?.cancel(); // don't poll in the background
    }
  }

  void _startPolling() {
    _poll?.cancel();
    _poll = Timer.periodic(_pollEvery, (_) => _load(announce: true));
  }

  // Orders the driver still needs to act on (not finished/cancelled).
  bool _actionable(DriverOrder o) =>
      o.status != 'Delivered' && o.status != 'Cancelled' && o.status != 'Failed';

  Future<void> _load({bool announce = false}) async {
    try {
      final orders = await _api.myOrders();
      if (!mounted) return;

      // Find new actionable orders since the last successful load.
      final fresh = orders.where((o) => _actionable(o) && !_knownIds.contains(o.id)).toList();
      for (final o in orders) {
        _knownIds.add(o.id);
      }
      setState(() { _orders = orders; _loading = false; });

      if (announce && _seeded && fresh.isNotEmpty) _announceNewOrder(fresh.first);
      _seeded = true;
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _announceNewOrder(DriverOrder o) {
    HapticFeedback.mediumImpact();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(tr('newOrder', vars: {'addr': o.address})),
      duration: const Duration(seconds: 6),
      action: SnackBarAction(
        label: tr('view'),
        onPressed: () async {
          await Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => DeliveryScreen(
              api: _api,
              orderId: o.id,
              address: o.address,
              cashEGP: double.tryParse(o.cashEGP) ?? 0,
              initialStatus: o.status,
            ),
          ));
          _load();
        },
      ),
    ));
  }

  double get _toHandOver => _orders
      .where((o) => o.status == 'Delivered')
      .fold(0.0, (s, o) => s + (double.tryParse(o.cashEGP) ?? 0));

  /// Returns true only if we have at least foreground location — without it the
  /// shift would "start" but report nothing, the worst silent failure.
  Future<bool> _ensurePermissions() async {
    final status = await Permission.locationWhenInUse.request();
    if (!status.isGranted) return false;
    // Background ("Allow all the time") keeps tracking alive with the screen
    // locked; on Android 11+ this hands off to a settings page.
    await Permission.locationAlways.request();
    // Best-effort extras — not blockers for going on shift.
    await Permission.notification.request();
    await Permission.ignoreBatteryOptimizations.request();
    return true;
  }

  void _warnLocationNeeded() {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(tr('locationNeeded')),
      duration: const Duration(seconds: 6),
      action: SnackBarAction(label: tr('openSettings'), onPressed: openAppSettings),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final deliveredCount = _orders.where((o) => o.status == 'Delivered').length;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
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
                    const Text('El Kaptin', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
                    const SizedBox(width: 6),
                    const Text('الكابتن', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: MeshwarColors.muted)),
                  ]),
                  Row(children: [
                    TextButton(onPressed: () => toggleLang(),
                      child: Text(langNotifier.value == 'ar' ? 'EN' : 'ع',
                        style: const TextStyle(color: MeshwarColors.brand, fontWeight: FontWeight.w700))),
                    IconButton(
                      tooltip: tr('myCash'),
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => EarningsScreen(token: widget.token))),
                      icon: const Icon(Icons.account_balance_wallet_outlined, color: MeshwarColors.brand),
                    ),
                    CircleAvatar(backgroundColor: Colors.white,
                      child: Text(widget.driverName.characters.first,
                        style: const TextStyle(color: MeshwarColors.brand, fontWeight: FontWeight.w700))),
                  ]),
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
                    Text(tr('cashInHand'),
                      style: TextStyle(color: Colors.white.withOpacity(.85), fontSize: 12, letterSpacing: .5)),
                    const SizedBox(height: 8),
                    Text('${_toHandOver.toStringAsFixed(2)} EGP',
                      style: const TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.w800)),
                    Text(tr('deliveriesToday', vars: {'n': '$deliveredCount'}),
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
                  if (!_onShift) {
                    final ok = await _ensurePermissions();
                    if (!mounted) return;
                    if (!ok) { _warnLocationNeeded(); return; } // don't start a blind shift
                    await startShift();
                  } else {
                    endShift();
                  }
                  if (mounted) setState(() => _onShift = !_onShift);
                },
                child: Text(_onShift ? tr('endShift') : tr('startShift')),
              ),
              if (_onShift)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.circle, color: MeshwarColors.ok, size: 10),
                    const SizedBox(width: 6),
                    Text(tr('locationOn'), style: const TextStyle(color: MeshwarColors.muted, fontSize: 12)),
                  ]),
                ),
              const SizedBox(height: 20),

              Text(tr('myOrders'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 10),
              if (_loading)
                const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
              else if (_orders.isEmpty)
                Padding(padding: const EdgeInsets.all(20),
                  child: Center(child: Text(tr('noOrders'), style: const TextStyle(color: MeshwarColors.muted)))),
              ..._orders.map((o) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: o.status == 'Delivered' ? null : () async {
                    await Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => DeliveryScreen(
                        api: _api,
                        orderId: o.id,
                        address: o.address,
                        cashEGP: double.tryParse(o.cashEGP) ?? 0,
                        initialStatus: o.status,
                      ),
                    ));
                    _load();
                  },
                  child: MeshwarCard(
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Flexible(child: Text(o.address, style: const TextStyle(fontWeight: FontWeight.w700))),
                          if (o.requiresPrescription)
                            const Padding(padding: EdgeInsets.only(left: 6),
                              child: Text('℞', style: TextStyle(color: MeshwarColors.danger, fontWeight: FontWeight.w800))),
                        ]),
                        if (o.landmark != null && o.landmark!.isNotEmpty)
                          Text('📍 ${o.landmark}', style: const TextStyle(color: MeshwarColors.muted, fontSize: 12)),
                        Text('${o.cashEGP} EGP', style: const TextStyle(color: MeshwarColors.muted, fontSize: 13)),
                      ])),
                      _StatusChip(o.status),
                      if (o.status != 'Delivered')
                        const Padding(padding: EdgeInsets.only(left: 6),
                          child: Icon(Icons.chevron_right, color: MeshwarColors.muted)),
                    ]),
                  ),
                ),
              )),
            ],
          ),
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
