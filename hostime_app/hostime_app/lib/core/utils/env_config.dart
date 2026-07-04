import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Reads Supabase credentials from --dart-define first (used in CI / release
/// builds), falling back to the .env file loaded via flutter_dotenv (used in
/// local development). Never hardcode real values here.
class EnvConfig {
  const EnvConfig._();

  static const _dartDefineUrl = String.fromEnvironment('SUPABASE_URL');
  static const _dartDefineAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static String get supabaseUrl =>
      _dartDefineUrl.isNotEmpty ? _dartDefineUrl : dotenv.env['SUPABASE_URL'] ?? '';

  static String get supabaseAnonKey => _dartDefineAnonKey.isNotEmpty
      ? _dartDefineAnonKey
      : dotenv.env['SUPABASE_ANON_KEY'] ?? '';

  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
