import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Persists the Supabase session through the platform secure storage
/// (Android Keystore-backed EncryptedSharedPreferences / iOS Keychain)
/// instead of supabase_flutter's default plain SharedPreferences, so the
/// refresh token never sits on disk unencrypted.
class SecureLocalStorage extends LocalStorage {
  SecureLocalStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _sessionKey = 'supabase.session';

  final FlutterSecureStorage _storage;

  @override
  Future<void> initialize() async {}

  @override
  Future<bool> hasAccessToken() async {
    return (await _storage.read(key: _sessionKey)) != null;
  }

  @override
  Future<String?> accessToken() async {
    return _storage.read(key: _sessionKey);
  }

  @override
  Future<void> removePersistedSession() async {
    await _storage.delete(key: _sessionKey);
  }

  @override
  Future<void> persistSession(String persistSessionString) async {
    await _storage.write(key: _sessionKey, value: persistSessionString);
  }
}
