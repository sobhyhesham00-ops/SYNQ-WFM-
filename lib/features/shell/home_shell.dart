import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/haptics.dart';
import '../dashboard/dashboard_screen.dart';
import '../debts/debts_screen.dart';
import '../ledger/ledger_screen.dart';
import '../qr_payment/get_paid_screen.dart';
import '../sales/add_sale_screen.dart';
import '../settings/settings_screen.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  static const _screens = [
    DashboardScreen(),
    LedgerScreen(),
    GetPaidScreen(),
    DebtsScreen(),
    SettingsScreen(),
  ];

  void _go(int i) {
    Haptics.light();
    setState(() => _index = i);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: _index == 0
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AddSaleScreen()),
              ),
              backgroundColor: AppColors.primary,
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: Text(context.l10n.t('add_sale'),
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700)),
            )
          : null,
      bottomNavigationBar: _BottomBar(index: _index, onTap: _go),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({required this.index, required this.onTap});
  final int index;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final items = <(IconData, String)>[
      (Icons.home_rounded, l.t('nav_home')),
      (Icons.receipt_long_rounded, l.t('nav_ledger')),
      (Icons.qr_code_rounded, l.t('nav_qr')),
      (Icons.handshake_rounded, l.t('nav_debts')),
      (Icons.settings_rounded, l.t('nav_settings')),
    ];

    return Container(
      decoration: BoxDecoration(
        color: theme.cardTheme.color,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(26)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 68,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (i) {
              final selected = i == index;
              final isCenter = i == 2;
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  borderRadius: BorderRadius.circular(20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          gradient: isCenter
                              ? const LinearGradient(
                                  colors: AppColors.brandGradient)
                              : null,
                          color: selected && !isCenter
                              ? AppColors.primary.withValues(alpha: 0.12)
                              : null,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Icon(
                          items[i].$1,
                          size: 24,
                          color: isCenter
                              ? Colors.white
                              : selected
                                  ? AppColors.primary
                                  : AppColors.textSecondaryLight,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        items[i].$2,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight:
                              selected ? FontWeight.w700 : FontWeight.w500,
                          color: selected
                              ? AppColors.primary
                              : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
