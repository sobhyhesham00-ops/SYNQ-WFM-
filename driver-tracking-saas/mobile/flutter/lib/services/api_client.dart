// Thin transport abstraction so the app doesn't hard-depend on WebSockets.
// Swap WsTrackingChannel for a FirestoreTrackingChannel later without touching
// UI or the background service.  (Blueprint §1.2)

import 'dart:convert';
import 'package:http/http.dart' as http;

abstract class TrackingChannel {
  /// Push a batch of location samples to the backend.
  Future<void> sendLocations(List<Map<String, dynamic>> samples);
}

/// REST helper for order lifecycle (transactional, not over the socket).
class OrderApi {
  OrderApi(this.baseUrl, this.token);
  final String baseUrl;
  final String token;

  Map<String, String> get _headers => {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      };

  Future<void> setStatus(String orderId, String status) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/orders/$orderId/status'),
      headers: _headers,
      body: jsonEncode({'status': status}), // 'PickedUp' | 'Delivered'
    );
    if (res.statusCode >= 400) {
      throw Exception('setStatus failed: ${res.body}');
    }
  }
}
