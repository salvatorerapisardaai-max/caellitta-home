import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/widgets/app_text_field.dart';
import 'property_form_controller.dart';

/// The nome/indirizzo/città/CIN/max-ospiti fields shared by the onboarding
/// wizard and the property edit screen.
class PropertyFormFields extends StatelessWidget {
  const PropertyFormFields({super.key, required this.controller});

  final PropertyFormController controller;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          label: 'Nome struttura',
          controller: controller.nameController,
          textCapitalization: TextCapitalization.words,
          validator: validatePropertyName,
        ),
        const SizedBox(height: 20),
        AppTextField(
          label: 'Indirizzo',
          controller: controller.addressController,
          textCapitalization: TextCapitalization.words,
          validator: validateAddress,
        ),
        const SizedBox(height: 20),
        AppTextField(
          label: 'Città',
          controller: controller.cityController,
          textCapitalization: TextCapitalization.words,
          validator: validateCity,
        ),
        const SizedBox(height: 20),
        AppTextField(
          label: 'CIN (opzionale)',
          controller: controller.cinController,
          textCapitalization: TextCapitalization.characters,
          tooltip:
              'Il Codice Identificativo Nazionale è l\'identificativo assegnato dal Ministero del Turismo alle strutture ricettive. Se non lo hai ancora, puoi aggiungerlo più tardi.',
          validator: validateCin,
        ),
        const SizedBox(height: 20),
        AppTextField(
          label: 'Numero massimo ospiti',
          controller: controller.maxGuestsController,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          validator: validateMaxGuests,
        ),
      ],
    );
  }
}
