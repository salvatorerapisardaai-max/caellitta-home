import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

enum BadgeTone { green, amber, red, gray }

/// Small uppercase pill used for statuses (property attiva/inattiva,
/// prenotazione confermata, ecc.) — mirrors the `.badge` classes in
/// globals.css.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, required this.tone});

  final String label;
  final BadgeTone tone;

  (Color bg, Color border, Color text) _colors() {
    switch (tone) {
      case BadgeTone.green:
        return (AppColors.greenDim, AppColors.green, AppColors.badgeGreenText);
      case BadgeTone.amber:
        return (const Color(0x1FA07828), AppColors.amber, AppColors.badgeAmberText);
      case BadgeTone.red:
        return (AppColors.redDim, AppColors.red, AppColors.badgeRedText);
      case BadgeTone.gray:
        return (const Color(0x1F5A5A5A), const Color(0x475A5A5A), AppColors.saltFaint);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (bg, border, text) = _colors();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border.withValues(alpha: 0.5)),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(fontSize: 10, letterSpacing: 1.6, color: text),
      ),
    );
  }
}
