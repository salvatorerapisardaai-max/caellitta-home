import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_banner.dart';
import '../../../core/widgets/status_badge.dart';
import '../data/property.dart';
import '../providers/property_providers.dart';

/// Shown only when the host manages more than one property — with exactly
/// one, the router sends the host straight to the detail screen instead.
class PropertiesListScreen extends ConsumerWidget {
  const PropertiesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final propertiesAsync = ref.watch(propertiesListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Le tue strutture')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/properties/new'),
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.lava,
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(propertiesListProvider.notifier).refresh(),
        child: propertiesAsync.when(
          data: (properties) => _PropertiesGrid(properties: properties),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const ErrorBanner(
                message: 'Impossibile caricare le strutture. Tira per aggiornare.',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PropertiesGrid extends StatelessWidget {
  const _PropertiesGrid({required this.properties});

  final List<Property> properties;

  @override
  Widget build(BuildContext context) {
    if (properties.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: const [EmptyState(message: 'Nessuna struttura ancora aggiunta')],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: properties.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final property = properties[index];
        return AppCard(
          onTap: () => context.push('/properties/${property.id}'),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      property.name,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      property.city,
                      style: const TextStyle(color: AppColors.saltDim, fontSize: 13),
                    ),
                  ],
                ),
              ),
              StatusBadge(
                label: property.isActive ? 'Attiva' : 'Inattiva',
                tone: property.isActive ? BadgeTone.green : BadgeTone.gray,
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right, color: AppColors.saltFaint),
            ],
          ),
        );
      },
    );
  }
}
