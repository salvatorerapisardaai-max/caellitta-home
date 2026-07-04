import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../data/property.dart';
import '../providers/property_providers.dart';

/// Bottom sheet for switching between properties when a host manages more
/// than one — surfaced from the detail screen's app bar.
Future<void> showPropertySwitcherSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: AppColors.lavaMid,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(4)),
    ),
    builder: (context) => const _PropertySwitcherSheet(),
  );
}

class _PropertySwitcherSheet extends ConsumerWidget {
  const _PropertySwitcherSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final properties = ref.watch(propertiesListProvider).value ?? const <Property>[];
    final selectedId = ref.watch(selectedPropertyProvider)?.id;

    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 36,
            height: 3,
            decoration: BoxDecoration(
              color: AppColors.goldDim2,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              children: [
                Text(
                  'LE TUE STRUTTURE',
                  style: TextStyle(fontSize: 11, letterSpacing: 2, color: AppColors.gold),
                ),
              ],
            ),
          ),
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: properties.length,
              itemBuilder: (context, index) {
                final property = properties[index];
                final selected = property.id == selectedId;
                return ListTile(
                  title: Text(property.name),
                  subtitle: Text(property.city, style: const TextStyle(color: AppColors.saltFaint)),
                  trailing: selected ? const Icon(Icons.check, color: AppColors.gold) : null,
                  onTap: () {
                    ref.read(selectedPropertyIdProvider.notifier).select(property.id);
                    Navigator.of(context).pop();
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
