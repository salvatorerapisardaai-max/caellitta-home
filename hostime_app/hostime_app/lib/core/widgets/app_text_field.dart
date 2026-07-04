import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';

/// Labeled text field with the site's uppercase eyebrow label above the
/// input, plus an optional info tooltip (used for CIN) and validation.
class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    this.controller,
    this.tooltip,
    this.keyboardType,
    this.obscureText = false,
    this.validator,
    this.inputFormatters,
    this.textCapitalization = TextCapitalization.none,
    this.autofillHints,
    this.enabled = true,
  });

  final String label;
  final TextEditingController? controller;
  final String? tooltip;
  final TextInputType? keyboardType;
  final bool obscureText;
  final String? Function(String?)? validator;
  final List<TextInputFormatter>? inputFormatters;
  final TextCapitalization textCapitalization;
  final Iterable<String>? autofillHints;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 2,
                color: AppColors.gold,
              ),
            ),
            if (tooltip != null) ...[
              const SizedBox(width: 6),
              Tooltip(
                message: tooltip!,
                triggerMode: TooltipTriggerMode.tap,
                child: const Icon(
                  Icons.info_outline,
                  size: 14,
                  color: AppColors.saltFaint,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          validator: validator,
          inputFormatters: inputFormatters,
          textCapitalization: textCapitalization,
          autofillHints: autofillHints,
          enabled: enabled,
          style: const TextStyle(color: AppColors.salt, fontSize: 15),
        ),
      ],
    );
  }
}
