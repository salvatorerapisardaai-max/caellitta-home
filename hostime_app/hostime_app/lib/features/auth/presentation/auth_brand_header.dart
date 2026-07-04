import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_colors.dart';

/// Brand lockup shared by the login and signup screens: serif wordmark in
/// gold + uppercase letter-spaced tagline underneath, matching the
/// Caellitta Home gestionale login page.
class AuthBrandHeader extends StatelessWidget {
  const AuthBrandHeader({super.key, required this.subtitle});

  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          'HosTime',
          style: GoogleFonts.cormorantGaramond(
            fontSize: 34,
            fontWeight: FontWeight.w300,
            letterSpacing: 6,
            color: AppColors.gold,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle.toUpperCase(),
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 11,
            letterSpacing: 3,
            color: AppColors.saltFaint,
          ),
        ),
      ],
    );
  }
}
