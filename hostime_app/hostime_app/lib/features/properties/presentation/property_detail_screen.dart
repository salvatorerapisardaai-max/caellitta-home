import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/section_header.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_providers.dart';
import '../data/property.dart';
import '../providers/property_providers.dart';
import 'property_switcher_sheet.dart';

class PropertyDetailScreen extends ConsumerWidget {
  const PropertyDetailScreen({super.key, required this.propertyId});

  final String propertyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final propertiesAsync = ref.watch(propertiesListProvider);

    return propertiesAsync.when(
      data: (properties) {
        Property? property;
        for (final p in properties) {
          if (p.id == propertyId) {
            property = p;
            break;
          }
        }
        property ??= properties.isNotEmpty ? properties.first : null;
        if (property == null) {
          return const Scaffold(body: Center(child: Text('Struttura non trovata')));
        }
        return _PropertyDetailBody(property: property, propertyCount: properties.length);
      },
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) => const Scaffold(
        body: Center(child: Text('Impossibile caricare la struttura.')),
      ),
    );
  }
}

class _PropertyDetailBody extends ConsumerWidget {
  const _PropertyDetailBody({required this.property, required this.propertyCount});

  final Property property;
  final int propertyCount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hostAsync = ref.watch(currentHostProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(property.name),
        actions: [
          if (propertyCount > 1)
            IconButton(
              icon: const Icon(Icons.swap_horiz),
              tooltip: 'Cambia struttura',
              onPressed: () => showPropertySwitcherSheet(context, ref),
            ),
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Modifica',
            onPressed: () => context.push('/properties/${property.id}/edit'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          hostAsync.maybeWhen(
            data: (host) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                'Bentornato, ${host.fullName.split(' ').first}',
                style: Theme.of(context).textTheme.displayMedium,
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        property.name,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    StatusBadge(
                      label: property.isActive ? 'Attiva' : 'Inattiva',
                      tone: property.isActive ? BadgeTone.green : BadgeTone.gray,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _DetailRow(icon: Icons.place_outlined, label: 'Indirizzo', value: property.address),
                _DetailRow(icon: Icons.location_city_outlined, label: 'Città', value: property.city),
                _DetailRow(
                  icon: Icons.badge_outlined,
                  label: 'CIN',
                  value: property.cin ?? 'Non impostato',
                ),
                _DetailRow(
                  icon: Icons.people_outline,
                  label: 'Ospiti massimi',
                  value: '${property.maxGuests}',
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const SectionHeader(title: 'Prossimamente'),
          const SizedBox(height: 12),
          AppCard(
            child: Text(
              'Prenotazioni, manutenzioni e notifiche push arriveranno nelle prossime versioni di HosTime.',
              style: const TextStyle(color: AppColors.saltFaint, fontSize: 13, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.gold),
          const SizedBox(width: 12),
          SizedBox(
            width: 110,
            child: Text(
              label.toUpperCase(),
              style: const TextStyle(fontSize: 11, letterSpacing: 1.2, color: AppColors.saltFaint),
            ),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(color: AppColors.salt, fontSize: 14)),
          ),
        ],
      ),
    );
  }
}
