import 'package:flutter/material.dart';

import '../data/property.dart';

/// Holds the text controllers for the create/edit property form so the
/// same fields can be reused by both the onboarding wizard and the
/// "edit property" screen without duplicating controller wiring.
class PropertyFormController {
  PropertyFormController({Property? initial})
      : nameController = TextEditingController(text: initial?.name ?? ''),
        addressController = TextEditingController(text: initial?.address ?? ''),
        cityController = TextEditingController(text: initial?.city ?? ''),
        cinController = TextEditingController(text: initial?.cin ?? ''),
        maxGuestsController =
            TextEditingController(text: (initial?.maxGuests ?? 2).toString());

  final formKey = GlobalKey<FormState>();
  final TextEditingController nameController;
  final TextEditingController addressController;
  final TextEditingController cityController;
  final TextEditingController cinController;
  final TextEditingController maxGuestsController;

  bool get isValid => formKey.currentState?.validate() ?? false;

  int get maxGuests => int.parse(maxGuestsController.text.trim());

  String? get cin =>
      cinController.text.trim().isEmpty ? null : cinController.text.trim();

  void dispose() {
    nameController.dispose();
    addressController.dispose();
    cityController.dispose();
    cinController.dispose();
    maxGuestsController.dispose();
  }
}

String? validatePropertyName(String? value) {
  if (value == null || value.trim().isEmpty) return 'Inserisci il nome della struttura';
  return null;
}

String? validateAddress(String? value) {
  if (value == null || value.trim().isEmpty) return 'Inserisci l\'indirizzo';
  return null;
}

String? validateCity(String? value) {
  if (value == null || value.trim().isEmpty) return 'Inserisci la città';
  return null;
}

String? validateCin(String? value) {
  if (value == null || value.trim().isEmpty) return null; // optional
  final cleaned = value.trim();
  if (cleaned.length < 6 || cleaned.contains(' ')) {
    return 'Formato CIN non valido';
  }
  return null;
}

String? validateMaxGuests(String? value) {
  if (value == null || value.trim().isEmpty) return 'Inserisci il numero massimo di ospiti';
  final parsed = int.tryParse(value.trim());
  if (parsed == null || parsed < 1) return 'Deve essere un numero maggiore di 0';
  if (parsed > 50) return 'Numero non plausibile';
  return null;
}
