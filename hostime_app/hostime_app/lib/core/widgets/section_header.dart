import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Uppercase, letter-spaced section title with an optional trailing action —
/// mirrors `.sec-hdr` / `.sec-title` from the site.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title.toUpperCase(), style: eyebrowStyle()),
        ?trailing,
      ],
    );
  }
}
