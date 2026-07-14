import 'package:flutter_contacts/flutter_contacts.dart';

/// Thin wrapper for picking a phone contact when creating a debt.
class ContactsService {
  ContactsService._();

  static Future<PickedContact?> pickOne() async {
    if (!await FlutterContacts.requestPermission(readonly: true)) {
      return null;
    }
    final contact = await FlutterContacts.openExternalPick();
    if (contact == null) return null;
    final full = await FlutterContacts.getContact(contact.id);
    final phone =
        (full?.phones.isNotEmpty ?? false) ? full!.phones.first.number : null;
    return PickedContact(
      name: full?.displayName ?? contact.displayName,
      phone: phone,
    );
  }
}

class PickedContact {
  const PickedContact({required this.name, this.phone});
  final String name;
  final String? phone;
}
