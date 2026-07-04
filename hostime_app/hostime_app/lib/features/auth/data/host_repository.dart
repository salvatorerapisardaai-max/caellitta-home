import 'package:supabase_flutter/supabase_flutter.dart';

import 'host.dart';

class HostRepository {
  HostRepository(this._client);

  final SupabaseClient _client;

  /// Fetches the `hosts` row for the signed-in user. Relies entirely on the
  /// `host_select_own` RLS policy (auth_user_id = auth.uid()) — never
  /// queries by anything else, and never uses the service_role key.
  Future<Host> fetchCurrentHost() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      throw StateError('fetchCurrentHost called without a signed-in user');
    }
    final row = await _client
        .from('hosts')
        .select()
        .eq('auth_user_id', userId)
        .single();
    return Host.fromJson(row);
  }
}
