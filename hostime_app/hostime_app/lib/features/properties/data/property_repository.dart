import 'package:supabase_flutter/supabase_flutter.dart';

import 'property.dart';

class PropertyRepository {
  PropertyRepository(this._client);

  final SupabaseClient _client;

  /// No `.eq('host_id', ...)` filter needed — the `properties_select_own`
  /// RLS policy already restricts rows to the signed-in host.
  Future<List<Property>> listForCurrentHost() async {
    final rows = await _client
        .from('properties')
        .select()
        .order('created_at', ascending: true);
    return (rows as List)
        .map((row) => Property.fromJson(row as Map<String, dynamic>))
        .toList();
  }

  Future<Property> create({
    required String hostId,
    required String name,
    required String address,
    required String city,
    required String? cin,
    required int maxGuests,
  }) async {
    final row = await _client
        .from('properties')
        .insert({
          'host_id': hostId,
          'name': name,
          'address': address,
          'city': city,
          'cin': (cin == null || cin.isEmpty) ? null : cin,
          'max_guests': maxGuests,
        })
        .select()
        .single();
    return Property.fromJson(row);
  }

  Future<Property> update(Property property) async {
    final row = await _client
        .from('properties')
        .update({
          'name': property.name,
          'address': property.address,
          'city': property.city,
          'cin': (property.cin == null || property.cin!.isEmpty) ? null : property.cin,
          'max_guests': property.maxGuests,
          'is_active': property.isActive,
        })
        .eq('id', property.id)
        .select()
        .single();
    return Property.fromJson(row);
  }

  Future<void> delete(String id) async {
    await _client.from('properties').delete().eq('id', id);
  }
}
