import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/haptics.dart';

class ChoiceItem<T> {
  const ChoiceItem({required this.value, required this.label, this.icon});
  final T value;
  final String label;
  final IconData? icon;
}

/// A large, wrap-based single-choice selector (chips) with big touch targets.
class ChoiceSelector<T> extends StatelessWidget {
  const ChoiceSelector({
    super.key,
    required this.items,
    required this.selected,
    required this.onSelected,
  });

  final List<ChoiceItem<T>> items;
  final T selected;
  final ValueChanged<T> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: items.map((item) {
        final isSel = item.value == selected;
        return Material(
          color: isSel
              ? AppColors.primary
              : theme.chipTheme.backgroundColor,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () {
              Haptics.light();
              onSelected(item.value);
            },
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (item.icon != null) ...[
                    Icon(item.icon,
                        size: 18,
                        color: isSel ? Colors.white : AppColors.primary),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    item.label,
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: isSel
                          ? Colors.white
                          : theme.textTheme.titleSmall?.color,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
