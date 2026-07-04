import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:hostime_app/features/auth/data/auth_repository.dart';

void main() {
  group('friendlyAuthError', () {
    test('maps invalid credentials to an Italian, user-safe message', () {
      final error = AuthException('Invalid login credentials');
      expect(friendlyAuthError(error), 'Credenziali non valide. Riprova.');
    });

    test('never leaks raw exception text for unknown errors', () {
      final error = Exception('connection reset by peer at socket 0x123');
      final message = friendlyAuthError(error);
      expect(message.contains('socket'), isFalse);
      expect(message.contains('0x123'), isFalse);
    });
  });
}
