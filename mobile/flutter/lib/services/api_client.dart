// REST client for the driver app. Talks to the Meshwar backend.
import 'dart:convert';
import 'package:http/http.dart' as http;

// Base URL from --dart-define=API_BASE=… (defaults to prod).
const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://api.meshwar.app');

/// A single active/recent order for the driver's list.
class DriverOrder {
  DriverOrder({
    required this.id, required this.address, required this.cashEGP,
    required this.status, this.phone, this.landmark, this.requiresPrescription = false,
  });
  final String id;
  final String address;
  final String cashEGP;
  final String status;
  final String? phone;
  final String? landmark;
  final bool requiresPrescription;

  factory DriverOrder.fromJson(Map<String, dynamic> j) => DriverOrder(
        id: j['id'] as String,
        address: j['address'] as String,
        cashEGP: j['cashEGP'] as String,
        status: j['status'] as String,
        phone: j['phone'] as String?,
        landmark: j['landmark'] as String?,
        requiresPrescription: (j['requiresPrescription'] ?? false) as bool,
      );
}

/// Driver-scoped API. Construct with the JWT from login.
class DriverApi {
  DriverApi(this.token, {this.baseUrl = apiBase});
  final String token;
  final String baseUrl;

  Map<String, String> get _h => {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      };

  /// Phone + PIN login. Returns {token, name}. Static — no token yet.
  static Future<Map<String, dynamic>> login(String phone, String password,
      {String baseUrl = apiBase}) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/driver/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'password': password}),
    );
    if (res.statusCode >= 400) throw Exception('login failed');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<List<DriverOrder>> myOrders() async {
    final res = await http.get(Uri.parse('$baseUrl/api/driver/me/orders'), headers: _h);
    if (res.statusCode >= 400) throw Exception('failed to load orders');
    return (jsonDecode(res.body) as List)
        .map((e) => DriverOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> mySummary() async {
    final res = await http.get(Uri.parse('$baseUrl/api/driver/me/summary'), headers: _h);
    if (res.statusCode >= 400) throw Exception('failed to load summary');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<void> setStatus(String orderId, String status) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/orders/$orderId/status'),
      headers: _h,
      body: jsonEncode({'status': status}), // 'PickedUp' | 'Delivered'
    );
    if (res.statusCode >= 400) throw Exception('setStatus failed: ${res.body}');
  }
}
