import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/services/contacts_service.dart';
import '../../data/models/enums.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/big_button.dart';
import '../../shared/widgets/choice_selector.dart';
import '../../shared/widgets/feedback.dart';
import '../../shared/widgets/labeled_field.dart';

class AddDebtScreen extends ConsumerStatefulWidget {
  const AddDebtScreen({super.key});

  @override
  ConsumerState<AddDebtScreen> createState() => _AddDebtScreenState();
}

class _AddDebtScreenState extends ConsumerState<AddDebtScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _amount = TextEditingController();
  final _note = TextEditingController();

  DebtDirection _direction = DebtDirection.theyOweMe;
  DateTime? _dueDate;
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _pickContact() async {
    final c = await ContactsService.pickOne();
    if (c == null) return;
    setState(() {
      _name.text = c.name;
      if (c.phone != null) _phone.text = c.phone!;
    });
  }

  Future<void> _pickDue() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (d != null) setState(() => _dueDate = d);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    await ref.read(debtsRepoProvider).add(
          contactName: _name.text.trim(),
          amount: double.parse(_amount.text),
          direction: _direction,
          phone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
          dueDate: _dueDate,
          note: _note.text.trim().isEmpty ? null : _note.text.trim(),
        );
    if (!mounted) return;
    showSavedFeedback(context, context.l10n.t('saved'));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.t('add_debt'))),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 40),
          children: [
            ChoiceSelector<DebtDirection>(
              selected: _direction,
              onSelected: (d) => setState(() => _direction = d),
              items: [
                ChoiceItem(
                    value: DebtDirection.theyOweMe,
                    label: l.t('debt_owed_to_me'),
                    icon: Icons.call_received_rounded),
                ChoiceItem(
                    value: DebtDirection.iOweThem,
                    label: l.t('debt_i_owe'),
                    icon: Icons.call_made_rounded),
              ],
            ),
            const SizedBox(height: 22),
            LabeledField(
              label: l.t('contact_name'),
              controller: _name,
              prefixIcon: Icons.person_rounded,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? l.t('required') : null,
            ),
            const SizedBox(height: 8),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                onPressed: _pickContact,
                icon: const Icon(Icons.contacts_rounded),
                label: Text(l.t('pick_from_contacts')),
              ),
            ),
            const SizedBox(height: 14),
            LabeledField(
              label: l.t('phone_number'),
              controller: _phone,
              keyboardType: TextInputType.phone,
              prefixIcon: Icons.phone_rounded,
            ),
            const SizedBox(height: 22),
            AmountField(
              label: l.t('debt_amount'),
              controller: _amount,
              validator: (v) {
                final d = double.tryParse(v ?? '');
                if (d == null || d <= 0) return l.t('invalid_amount');
                return null;
              },
            ),
            const SizedBox(height: 22),
            LabeledField(
              label: l.t('due_date'),
              controller: TextEditingController(
                text: _dueDate == null
                    ? ''
                    : '${_dueDate!.year}/${_dueDate!.month}/${_dueDate!.day}',
              ),
              prefixIcon: Icons.event_rounded,
              suffix: IconButton(
                  onPressed: _pickDue,
                  icon: const Icon(Icons.calendar_month_rounded)),
            ),
            const SizedBox(height: 22),
            LabeledField(
                label: l.t('note_optional'), controller: _note, maxLines: 2),
            const SizedBox(height: 30),
            BigButton(
              label: l.t('save'),
              icon: Icons.check_rounded,
              loading: _saving,
              onPressed: _save,
            ),
          ],
        ),
      ),
    );
  }
}
