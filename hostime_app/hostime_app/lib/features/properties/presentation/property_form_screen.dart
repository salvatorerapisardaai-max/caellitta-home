import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/error_banner.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/property.dart';
import '../providers/property_providers.dart';
import 'property_form_controller.dart';
import 'property_form_fields.dart';

/// Used both to create an additional property (host already has ≥1) and
/// to edit an existing one. First-property creation goes through the
/// onboarding wizard instead, which has its own welcoming framing.
class PropertyFormScreen extends ConsumerStatefulWidget {
  const PropertyFormScreen({super.key, this.existing});

  final Property? existing;

  @override
  ConsumerState<PropertyFormScreen> createState() => _PropertyFormScreenState();
}

class _PropertyFormScreenState extends ConsumerState<PropertyFormScreen> {
  late final _controller = PropertyFormController(initial: widget.existing);
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _isEditing => widget.existing != null;

  Future<void> _submit() async {
    if (!_controller.isValid) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final notifier = ref.read(propertiesListProvider.notifier);
      if (_isEditing) {
        final updated = widget.existing!.copyWith(
          name: _controller.nameController.text.trim(),
          address: _controller.addressController.text.trim(),
          city: _controller.cityController.text.trim(),
          cin: _controller.cin,
          maxGuests: _controller.maxGuests,
        );
        await notifier.updateProperty(updated);
      } else {
        await notifier.createProperty(
          name: _controller.nameController.text.trim(),
          address: _controller.addressController.text.trim(),
          city: _controller.cityController.text.trim(),
          cin: _controller.cin,
          maxGuests: _controller.maxGuests,
        );
      }
      if (mounted) context.pop();
    } catch (_) {
      setState(() {
        _error = 'Impossibile salvare la struttura. Riprova.';
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEditing ? 'Modifica struttura' : 'Nuova struttura')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
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
                  const SizedBox(height: 28),
                  PrimaryButton(
                    label: _saving ? 'Salvataggio…' : 'Salva',
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
