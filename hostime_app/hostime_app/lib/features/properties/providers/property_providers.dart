import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/supabase/supabase_providers.dart';
import '../../auth/providers/auth_providers.dart';
import '../data/property.dart';
import '../data/property_repository.dart';

part 'property_providers.g.dart';

@Riverpod(keepAlive: true)
PropertyRepository propertyRepository(Ref ref) {
  return PropertyRepository(ref.watch(supabaseClientProvider));
}

/// The signed-in host's properties. Also doubles as the source of truth
/// for whether the onboarding wizard should show (empty list == new host).
@riverpod
class PropertiesList extends _$PropertiesList {
  @override
  Future<List<Property>> build() {
    return ref.watch(propertyRepositoryProvider).listForCurrentHost();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<Property> createProperty({
    required String name,
    required String address,
    required String city,
    required String? cin,
    required int maxGuests,
  }) async {
    final host = await ref.read(currentHostProvider.future);
    final created = await ref.read(propertyRepositoryProvider).create(
          hostId: host.id,
          name: name,
          address: address,
          city: city,
          cin: cin,
          maxGuests: maxGuests,
        );
    ref.invalidateSelf();
    await future;
    return created;
  }

  Future<void> updateProperty(Property property) async {
    await ref.read(propertyRepositoryProvider).update(property);
    ref.invalidateSelf();
    await future;
  }

  Future<void> deleteProperty(String id) async {
    await ref.read(propertyRepositoryProvider).delete(id);
    ref.invalidateSelf();
    await future;
  }
}

/// Which property is showing in the detail screen when the host manages
/// more than one. Not persisted — resets to the default (first property)
/// on cold start, which is an acceptable trade-off for phase 1.
@riverpod
class SelectedPropertyId extends _$SelectedPropertyId {
  @override
  String? build() => null;

  void select(String id) => state = id;
}

/// Resolves to the selected property, falling back to the first one so
/// callers never have to null-check for the common single-property case.
@riverpod
Property? selectedProperty(Ref ref) {
  final properties = ref.watch(propertiesListProvider).value ?? const [];
  if (properties.isEmpty) return null;
  final selectedId = ref.watch(selectedPropertyIdProvider);
  if (selectedId == null) return properties.first;
  return properties.firstWhere(
    (p) => p.id == selectedId,
    orElse: () => properties.first,
  );
}
