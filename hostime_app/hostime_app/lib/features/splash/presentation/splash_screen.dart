import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_colors.dart';

/// Shown briefly while the router figures out where a signed-in host
/// belongs (onboarding vs. single property vs. property list) — see
/// core/router/app_router.dart for the actual redirect logic.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'HosTime',
              style: GoogleFonts.cormorantGaramond(
                fontSize: 30,
                fontWeight: FontWeight.w300,
                letterSpacing: 6,
                color: AppColors.gold,
              ),
            ),
            const SizedBox(height: 24),
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.gold),
            ),
          ],
        ),
      ),
    );
  }
}
