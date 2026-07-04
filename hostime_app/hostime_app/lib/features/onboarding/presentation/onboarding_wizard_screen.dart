import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/error_banner.dart';
import '../../../core/widgets/primary_button.dart';
import '../../properties/presentation/property_form_controller.dart';
import '../../properties/presentation/property_form_fields.dart';
import '../../properties/providers/property_providers.dart';

/// Shown once, right after signup, when the host has zero properties yet.
/// No mention of RLS/hosts/multi-tenant anywhere — from the host's point
/// of view this is just "tell us about your place". As soon as the
/// property is created, propertiesListProvider becomes non-empty and the
/// router moves the host straight into the property detail screen.
class OnboardingWizardScreen extends ConsumerStatefulWidget {
  const OnboardingWizardScreen({super.key});

  @override
  ConsumerState<OnboardingWizardScreen> createState() => _OnboardingWizardScreenState();
}

class _OnboardingWizardScreenState extends ConsumerState<OnboardingWizardScreen> {
  late final _controller = PropertyFormController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_controller.isValid) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(propertiesListProvider.notifier).createProperty(
            name: _controller.nameController.text.trim(),
            address: _controller.addressController.text.trim(),
            city: _controller.cityController.text.trim(),
            cin: _controller.cin,
            maxGuests: _controller.maxGuests,
          );
      // No navigation call needed: the router redirect reacts to
      // propertiesListProvider becoming non-empty.
    } catch (_) {
      setState(() {
        _error = 'Non siamo riusciti a salvare la struttura. Riprova.';
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 16),
            Text(
              'Aggiungi la tua prima struttura',
              style: Theme.of(context).textTheme.displayMedium,
            ),
            const SizedBox(height: 8),
            const Text(
              'Bastano pochi dati per iniziare a gestirla da qui. Potrai completare tutto il resto in seguito.',
              style: TextStyle(color: AppColors.saltFaint, fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 32),
            Form(
              key: _controller.formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_error != null) ...[
                    ErrorBanner(message: _error!),
                    const SizedBox(height: 16),
                  ],
                  PropertyFormFields(controller: _controller),
                  const SizedBox(height: 32),
                  PrimaryButton(
                    label: _saving ? 'Salvataggio…' : 'Continua',
                    loading: _saving,
                    onPressed: _submit,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
