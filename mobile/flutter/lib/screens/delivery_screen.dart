// Active delivery — the screen a driver lives on while on a run.
//  - Big "cash to collect" so they never forget the COD amount.
//  - "Navigate" deep-links into the driver's own Google Maps (no Maps API cost).
//  - Picked up / Delivered POST to the backend and drive the order lifecycle.
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme.dart';
import '../i18n.dart';
import '../services/api_client.dart';

class DeliveryScreen extends StatefulWidget {
  const DeliveryScreen({
    super.key,
    required this.api,
    required this.orderId,
    required this.address,
    required this.cashEGP,
    this.initialStatus = 'Assigned',
  });

  final DriverApi api;
  final String orderId;
  final String address;
  final double cashEGP;
  final String initialStatus;

  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  late String _status = widget.initialStatus;
  bool _busy = false;
  final _otp = TextEditingController();
  String? _otpError;

  Future<void> _navigate() async {
    // Opens Google Maps turn-by-turn to the customer address.
    final q = Uri.encodeComponent(widget.address);
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$q&travelmode=driving');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open Maps')));
    }
  }

  Future<void> _setStatus(String next, {String? reason}) async {
    setState(() { _busy = true; _otpError = null; });
    try {
      await widget.api.setStatus(widget.orderId, next,
          otp: next == 'Delivered' ? _otp.text.trim() : null, reason: reason);
      setState(() => _status = next);
      if ((next == 'Delivered' || next == 'Failed') && mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (e.toString().contains('wrong_otp')) {
        setState(() => _otpError = 'الكود غلط · Wrong code');
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // Driver couldn't deliver (customer not home / refused / bad address).
  Future<void> _confirmFailed() async {
    final reason = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(tr('whyFailed'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          ),
          for (final r in const ['notHome', 'refused', 'wrongAddress'])
            ListTile(title: Text(tr(r)), onTap: () => Navigator.of(ctx).pop(tr(r))),
          const SizedBox(height: 8),
        ]),
      ),
    );
    if (reason != null) await _setStatus('Failed', reason: reason);
  }

  @override
  Widget build(BuildContext context) {
    final picked = _status == 'PickedUp' || _status == 'Delivered';
    return Scaffold(
      appBar: AppBar(title: const Text('Active delivery'), backgroundColor: Colors.transparent, elevation: 0),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Cash hero
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(gradient: MeshwarColors.brandGradient, borderRadius: BorderRadius.circular(20)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('COLLECT FROM CUSTOMER',
                    style: TextStyle(color: Colors.white.withOpacity(.85), fontSize: 12, letterSpacing: .5)),
                  const SizedBox(height: 8),
                  Text('${widget.cashEGP.toStringAsFixed(2)} EGP',
                    style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w800)),
                ]),
              ),
              const SizedBox(height: 16),

              MeshwarCard(
                child: Row(children: [
                  const Icon(Icons.location_on, color: MeshwarColors.brand),
                  const SizedBox(width: 10),
                  Expanded(child: Text(widget.address, style: const TextStyle(fontWeight: FontWeight.w600))),
                ]),
              ),
              const SizedBox(height: 12),

              OutlinedButton.icon(
                onPressed: _navigate,
                icon: const Icon(Icons.navigation),
                label: const Text('Navigate in Google Maps'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: MeshwarColors.brand),
                  foregroundColor: MeshwarColors.brand,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                ),
              ),

              const Spacer(),

              // Lifecycle actions
              if (!picked)
                FilledButton(
                  onPressed: _busy ? null : () => _setStatus('PickedUp'),
                  child: _busy ? _spinner() : Text(tr('pickedUp')),
                ),
              if (picked) ...[
                // Ask the customer for their 4-digit code before confirming.
                TextField(
                  controller: _otp,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  onChanged: (_) => setState(() {}),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 8),
                  decoration: InputDecoration(
                    labelText: 'كود الاستلام · Delivery code',
                    errorText: _otpError,
                    filled: true, fillColor: const Color(0xFFFBFAFF),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: MeshwarColors.ok),
                  onPressed: (_busy || _otp.text.trim().length < 4) ? null : () => _setStatus('Delivered'),
                  child: _busy ? _spinner() : Text(tr('delivered')),
                ),
              ],
              if (_status != 'Delivered')
                TextButton(
                  onPressed: _busy ? null : _confirmFailed,
                  child: Text(tr('couldntDeliver'),
                    style: const TextStyle(color: MeshwarColors.danger, fontWeight: FontWeight.w700)),
                ),
              const SizedBox(height: 8),
              Center(child: Text('Status: $_status', style: const TextStyle(color: MeshwarColors.muted, fontSize: 12))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _spinner() => const SizedBox(height: 20, width: 20,
      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white));
}
