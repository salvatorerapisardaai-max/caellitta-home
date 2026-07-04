import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'supabase_providers.g.dart';

/// The single Supabase client instance, initialized in main() before the
/// app starts. Always uses the public anon key — RLS policies on every
/// table are what isolate one host's data from another's, so the client
/// must never be handed a service_role key.
@Riverpod(keepAlive: true)
SupabaseClient supabaseClient(Ref ref) => Supabase.instance.client;

/// Fires on sign-in, sign-out, and token refresh. Used by the router to
/// redirect between the auth flow and the authenticated app shell.
@Riverpod(keepAlive: true)
Stream<AuthState> authStateChanges(Ref ref) {
  return ref.watch(supabaseClientProvider).auth.onAuthStateChange;
}

/// The currently signed-in Supabase auth user, or null when logged out.
@riverpod
User? currentUser(Ref ref) {
  final client = ref.watch(supabaseClientProvider);
  final authState = ref.watch(authStateChangesProvider).value;
  return authState?.session?.user ?? client.auth.currentSession?.user;
}
