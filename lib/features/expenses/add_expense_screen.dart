import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../data/models/enums.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/big_button.dart';
import '../../shared/widgets/choice_selector.dart';
import '../../shared/widgets/feedback.dart';
import '../../shared/widgets/labeled_field.dart';

class AddExpenseScreen extends ConsumerStatefulWidget {
  const AddExpenseScreen({super.key});

  @override
  ConsumerState<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends ConsumerState<AddExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _supplier = TextEditingController();
  final _note = TextEditingController();

  ExpenseType _type = ExpenseType.stock;
  bool _saving = false;

  @override
  void dispose() {
    _amount.dispose();
    _supplier.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    await ref.read(expensesRepoProvider).add(
          amount: double.parse(_amount.text),
          type: _type,
          supplierName:
              _supplier.text.trim().isEmpty ? null : _supplier.text.trim(),
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
      appBar: AppBar(title: Text(l.t('add_expense'))),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 40),
          children: [
            AmountField(
              label: l.t('expense_amount'),
              controller: _amount,
              validator: (v) {
                final d = double.tryParse(v ?? '');
                if (d == null || d <= 0) return l.t('invalid_amount');
                return null;
              },
            ),
            const SizedBox(height: 22),
            Padding(
              padding: const EdgeInsets.only(bottom: 12, right: 4, left: 4),
              child: Text(l.t('expense_type'),
                  style: Theme.of(context)
                      .textTheme
                      .labelLarge
                      ?.copyWith(fontWeight: FontWeight.w700)),
            ),
            ChoiceSelector<ExpenseType>(
              selected: _type,
              onSelected: (t) => setState(() => _type = t),
              items: [
                ChoiceItem(
                    value: ExpenseType.stock,
                    label: l.t('exp_stock'),
                    icon: Icons.inventory_2_rounded),
                ChoiceItem(
                    value: ExpenseType.rent,
                    label: l.t('exp_rent'),
                    icon: Icons.home_rounded),
                ChoiceItem(
                    value: ExpenseType.electricity,
                    label: l.t('exp_electricity'),
                    icon: Icons.bolt_rounded),
                ChoiceItem(
                    value: ExpenseType.supplier,
                    label: l.t('exp_supplier'),
                    icon: Icons.local_shipping_rounded),
                ChoiceItem(
                    value: ExpenseType.salaries,
                    label: l.t('exp_salaries'),
                    icon: Icons.badge_rounded),
                ChoiceItem(
                    value: ExpenseType.other,
                    label: l.t('exp_other'),
                    icon: Icons.more_horiz_rounded),
              ],
            ),
            const SizedBox(height: 22),
            LabeledField(
              label: l.t('supplier_name'),
              controller: _supplier,
              prefixIcon: Icons.storefront_rounded,
            ),
            const SizedBox(height: 22),
            LabeledField(
              label: l.t('note_optional'),
              controller: _note,
              maxLines: 2,
            ),
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
