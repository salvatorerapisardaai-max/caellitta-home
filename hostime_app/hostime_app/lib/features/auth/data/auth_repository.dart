import 'package:supabase_flutter/supabase_flutter.dart';

/// Thin wrapper around Supabase Auth. The `hosts` row for a new user is
/// provisioned server-side by the `on_auth_user_created` Postgres trigger
/// (see supabase/migrations/0002_host_signup_trigger.sql) — this class only
/// ever talks to auth.users, never to the `hosts` table directly.
class AuthRepository {
  AuthRepository(this._client);

  final SupabaseClient _client;

  Session? get currentSession => _client.auth.currentSession;

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) {
    return _client.auth.signInWithPassword(email: email, password: password);
  }

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
  }) {
    return _client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName},
    );
  }

  Future<void> signOut() => _client.auth.signOut();

  Future<void> resetPasswordForEmail(String email) {
    return _client.auth.resetPasswordForEmail(email);
  }
}

/// Translates Supabase Auth errors into short Italian messages safe to show
/// in the UI. Never surfaces raw exception text or stack traces.
String friendlyAuthError(Object error) {
  if (error is AuthException) {
    final message = error.message.toLowerCase();
    if (message.contains('invalid login credentials')) {
      return 'Credenziali non valide. Riprova.';
    }
    if (message.contains('email not confirmed')) {
      return 'Conferma la tua email prima di accedere: controlla la posta in arrivo.';
    }
    if (message.contains('user already registered') ||
        message.contains('already registered')) {
      return 'Esiste già un account con questa email. Prova ad accedere.';
    }
    if (message.contains('password should be at least')) {
      return 'La password deve contenere almeno 6 caratteri.';
    }
    if (message.contains('rate limit')) {
      return 'Troppi tentativi. Riprova tra qualche minuto.';
    }
    return 'Si è verificato un errore. Riprova.';
  }
  return 'Impossibile completare l\'operazione. Controlla la connessione e riprova.';
}
