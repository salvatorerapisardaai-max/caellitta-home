import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Inline error message box — never shows raw exceptions/stack traces,
/// only the user-friendly message passed in.
class ErrorBanner extends StatelessWidget {
  const ErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.redDim,
        border: Border.all(color: AppColors.red.withValues(alpha: 0.4)),
      ),
      child: Text(
        message,
        style: const TextStyle(color: AppColors.badgeRedText, fontSize: 13, height: 1.4),
      ),
    );
  }
}
