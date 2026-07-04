import 'package:flutter/material.dart';

/// Palette lifted from Caellitta Home's gestionale (globals.css custom
/// properties): dark volcanic "lava" surface, warm gold accent, deep sea
/// blue, and "salt" off-white text — the Etna/Mediterranean identity of
/// the original site, reused here so HosTime reads as the same family of
/// product rather than a generic SaaS template.
class AppColors {
  const AppColors._();

  static const lava = Color(0xFF111009);
  static const lavaMid = Color(0xFF1C1710);
  static const lavaCard = Color(0xFF221D14);
  static const lavaHover = Color(0xFF2A2418);

  static const gold = Color(0xFFC9AB72);
  static const goldLight = Color(0xFFE8D0A0);
  static const goldDim = Color(0x1FC9AB72); // ~12% opacity
  static const goldDim2 = Color(0x38C9AB72); // ~22% opacity

  static const sea = Color(0xFF1B3A50);
  static const seaLight = Color(0xFF2A5F7A);

  static const salt = Color(0xFFF0EBE1);
  static const saltDim = Color(0x94F0EBE1); // ~58% opacity
  static const saltFaint = Color(0x42F0EBE1); // ~26% opacity

  static const green = Color(0xFF4A8A68);
  static const greenDim = Color(0x264A8A68);
  static const red = Color(0xFF8A4848);
  static const redDim = Color(0x268A4848);
  static const amber = Color(0xFFA07828);

  static const badgeGreenText = Color(0xFF7DCCA0);
  static const badgeAmberText = Color(0xFFD4A84A);
  static const badgeRedText = Color(0xFFE08080);
}
