import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/enums.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/big_button.dart';
import '../../shared/widgets/choice_selector.dart';
import '../../shared/widgets/feedback.dart';
import '../../shared/widgets/labeled_field.dart';

/// Specialized Fawry / e-wallet entry form. Captures the customer reference and
/// the transaction value, and explicitly breaks out the *merchant commission*
/// as a separate revenue stream.
class AddFawryScreen extends ConsumerStatefulWidget {
  const AddFawryScreen({super.key});

  @override
  ConsumerState<AddFawryScreen> createState() => _AddFawryScreenState();
}

class _AddFawryScreenState extends ConsumerState<AddFawryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _gross = TextEditingController();
  final _commission = TextEditingController();
  final _reference = TextEditingController();
  final _phone = TextEditingController();

  ServiceType _type = ServiceType.bill;
  bool _saving = false;

  @override
  void dispose() {
    _gross.dispose();
    _commission.dispose();
    _reference.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    await ref.read(fawryRepoProvider).add(
          grossAmount: double.parse(_gross.text),
          commission: double.tryParse(_commission.text) ?? 0,
          serviceType: _type,
          referenceNumber:
              _reference.text.trim().isEmpty ? null : _reference.text.trim(),
          customerPhone:
              _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        );
    if (!mounted) return;
    showSavedFeedback(context, context.l10n.t('saved'));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.t('fawry_title'))),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 40),
          children: [
            AppCard(
              color: AppColors.service.withValues(alpha: 0.12),
              child: Row(
                children: [
                  const Icon(Icons.info_rounded, color: AppColors.service),
                  const SizedBox(width: 10),
                  Expanded(child: Text(l.t('fawry_hint'))),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.only(bottom: 12, right: 4, left: 4),
              child: Text(l.t('service_type'),
                  style: Theme.of(context)
                      .textTheme
                      .labelLarge
                      ?.copyWith(fontWeight: FontWeight.w700)),
            ),
            ChoiceSelector<ServiceType>(
              selected: _type,
              onSelected: (t) => setState(() => _type = t),
              items: ServiceType.values
                  .map((t) => ChoiceItem(value: t, label: l.t(t.labelKey)))
                  .toList(),
            ),
            const SizedBox(height: 22),
            AmountField(
              label: l.t('gross_amount'),
              controller: _gross,
              validator: (v) {
                final d = double.tryParse(v ?? '');
                if (d == null || d <= 0) return l.t('invalid_amount');
                return null;
              },
            ),
            const SizedBox(height: 22),
            // Commission — highlighted as pure revenue.
            LabeledField(
              label: l.t('merchant_commission'),
              controller: _commission,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              prefixIcon: Icons.trending_up_rounded,
              hint: '0',
            ),
            const SizedBox(height: 22),
            LabeledField(
              label: l.t('reference_number'),
              controller: _reference,
              prefixIcon: Icons.confirmation_number_rounded,
            ),
            const SizedBox(height: 22),
            LabeledField(
              label: l.t('customer_phone'),
              controller: _phone,
              keyboardType: TextInputType.phone,
              prefixIcon: Icons.phone_rounded,
            ),
            const SizedBox(height: 30),
            BigButton(
              label: l.t('save'),
              icon: Icons.check_rounded,
              gradient: const [AppColors.service, Color(0xFFFFB65C)],
              loading: _saving,
              onPressed: _save,
            ),
          ],
        ),
      ),
    );
  }
}
