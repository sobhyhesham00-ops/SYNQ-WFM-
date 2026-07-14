import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../data/models/enums.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/big_button.dart';
import '../../shared/widgets/choice_selector.dart';
import '../../shared/widgets/feedback.dart';
import '../../shared/widgets/labeled_field.dart';

class AddSaleScreen extends ConsumerStatefulWidget {
  const AddSaleScreen({super.key});

  @override
  ConsumerState<AddSaleScreen> createState() => _AddSaleScreenState();
}

class _AddSaleScreenState extends ConsumerState<AddSaleScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _quantity = TextEditingController(text: '1');
  final _neighborhood = TextEditingController();
  final _note = TextEditingController();

  PaymentMethod _method = PaymentMethod.cash;
  ProductCategory _category = ProductCategory.groceries;
  bool _saving = false;

  @override
  void dispose() {
    _amount.dispose();
    _quantity.dispose();
    _neighborhood.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    await ref.read(salesRepoProvider).add(
          amount: double.parse(_amount.text),
          method: _method,
          category: _category,
          quantity: int.tryParse(_quantity.text) ?? 1,
          neighborhood:
              _neighborhood.text.trim().isEmpty ? null : _neighborhood.text.trim(),
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
      appBar: AppBar(title: Text(l.t('add_sale'))),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 40),
          children: [
            AmountField(
              label: l.t('sale_amount'),
              controller: _amount,
              validator: (v) {
                final d = double.tryParse(v ?? '');
                if (d == null || d <= 0) return l.t('invalid_amount');
                return null;
              },
            ),
            const SizedBox(height: 22),
            _label(l.t('payment_method')),
            ChoiceSelector<PaymentMethod>(
              selected: _method,
              onSelected: (m) => setState(() => _method = m),
              items: [
                ChoiceItem(
                    value: PaymentMethod.cash,
                    label: l.t('cash'),
                    icon: Icons.payments_rounded),
                ChoiceItem(
                    value: PaymentMethod.instapay,
                    label: l.t('instapay'),
                    icon: Icons.qr_code_rounded),
                ChoiceItem(
                    value: PaymentMethod.wallet,
                    label: l.t('wallet'),
                    icon: Icons.account_balance_wallet_rounded),
                ChoiceItem(
                    value: PaymentMethod.card,
                    label: l.t('card'),
                    icon: Icons.credit_card_rounded),
              ],
            ),
            const SizedBox(height: 22),
            _label(l.t('product_category')),
            ChoiceSelector<ProductCategory>(
              selected: _category,
              onSelected: (c) => setState(() => _category = c),
              items: ProductCategory.values
                  .map((c) => ChoiceItem(value: c, label: l.t(c.labelKey)))
                  .toList(),
            ),
            const SizedBox(height: 22),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: LabeledField(
                    label: l.t('quantity'),
                    controller: _quantity,
                    keyboardType: TextInputType.number,
                    prefixIcon: Icons.numbers_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: LabeledField(
                    label: l.t('neighborhood'),
                    controller: _neighborhood,
                    prefixIcon: Icons.place_rounded,
                  ),
                ),
              ],
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

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 12, right: 4, left: 4),
        child: Text(text,
            style: Theme.of(context)
                .textTheme
                .labelLarge
                ?.copyWith(fontWeight: FontWeight.w700)),
      );
}
