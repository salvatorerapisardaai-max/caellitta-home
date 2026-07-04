import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// Material 3 dark theme matching the Caellitta Home gestionale: "Jost" for
/// body/UI text, "Cormorant Garamond" for brand/display moments, thin
/// gold-dim borders instead of shadows, uppercase letter-spaced labels.
class AppTheme {
  const AppTheme._();

  static ThemeData get dark {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.lava,
      colorScheme: const ColorScheme.dark(
        surface: AppColors.lava,
        primary: AppColors.gold,
        onPrimary: AppColors.lava,
        secondary: AppColors.sea,
        onSecondary: AppColors.salt,
        error: AppColors.red,
        onError: AppColors.salt,
        outline: AppColors.goldDim2,
      ),
    );

    final bodyTextTheme = GoogleFonts.jostTextTheme(base.textTheme).apply(
      bodyColor: AppColors.salt,
      displayColor: AppColors.salt,
    );

    final displayFont = GoogleFonts.cormorantGaramond();

    return base.copyWith(
      textTheme: bodyTextTheme.copyWith(
        displayLarge: displayFont.copyWith(
          fontSize: 32,
          fontWeight: FontWeight.w300,
          letterSpacing: 2,
          color: AppColors.gold,
        ),
        displayMedium: displayFont.copyWith(
          fontSize: 24,
          fontWeight: FontWeight.w300,
          color: AppColors.salt,
        ),
        titleLarge: displayFont.copyWith(
          fontSize: 20,
          fontWeight: FontWeight.w400,
          color: AppColors.salt,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.lava,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: displayFont.copyWith(
          fontSize: 19,
          fontWeight: FontWeight.w400,
          color: AppColors.salt,
        ),
        iconTheme: const IconThemeData(color: AppColors.gold),
      ),
      cardTheme: CardThemeData(
        color: AppColors.lavaCard,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(2),
          side: const BorderSide(color: AppColors.goldDim),
        ),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.goldDim, space: 1),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0x0AF0EBE1),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: AppColors.goldDim2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: AppColors.goldDim2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: AppColors.gold),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: AppColors.red),
        ),
        labelStyle: const TextStyle(
          color: AppColors.gold,
          fontSize: 12,
          letterSpacing: 2,
        ),
        hintStyle: const TextStyle(color: AppColors.saltFaint),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.gold,
          foregroundColor: AppColors.lava,
          disabledBackgroundColor: AppColors.goldDim2,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
          textStyle: GoogleFonts.jost(
            fontSize: 13,
            letterSpacing: 3,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.gold,
          side: const BorderSide(color: AppColors.goldDim2),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
          textStyle: GoogleFonts.jost(fontSize: 12, letterSpacing: 2.5),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.gold,
          textStyle: GoogleFonts.jost(fontSize: 12, letterSpacing: 2),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.lavaCard,
        contentTextStyle: const TextStyle(color: AppColors.salt),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(2),
          side: const BorderSide(color: AppColors.goldDim),
        ),
        behavior: SnackBarBehavior.floating,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.lavaCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(2),
          side: const BorderSide(color: AppColors.goldDim),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.lavaMid,
        surfaceTintColor: Colors.transparent,
      ),
      dividerColor: AppColors.goldDim,
    );
  }
}

/// Uppercase, letter-spaced "eyebrow" label style used throughout the site
/// for section titles and form labels (see .sec-title / .form-label in
/// globals.css).
TextStyle eyebrowStyle({Color color = AppColors.gold, double fontSize = 11}) {
  return GoogleFonts.jost(
    fontSize: fontSize,
    letterSpacing: 2.6,
    color: color,
  );
}
