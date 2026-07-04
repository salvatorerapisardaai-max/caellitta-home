import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Thin gold-bordered surface used for cards/panels across the app,
/// mirroring the `.card` class in Caellitta Home's globals.css.
class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child, this.padding, this.onTap});

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: padding ?? const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.lavaCard,
        border: Border.all(color: AppColors.goldDim),
      ),
      child: child,
    );

    if (onTap == null) return content;

    return InkWell(
      onTap: onTap,
      hoverColor: AppColors.lavaHover,
      child: content,
    );
  }
}
