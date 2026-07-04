import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/supabase/supabase_providers.dart';
import '../data/auth_repository.dart';
import '../data/host.dart';
import '../data/host_repository.dart';

part 'auth_providers.g.dart';

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) {
  return AuthRepository(ref.watch(supabaseClientProvider));
}

@Riverpod(keepAlive: true)
HostRepository hostRepository(Ref ref) {
  return HostRepository(ref.watch(supabaseClientProvider));
}

/// The signed-in host's own profile row. Re-fetched whenever the auth
/// state changes (sign-in/sign-out), so it always reflects the current
/// user rather than a stale one left over from a previous session.
@riverpod
Future<Host> currentHost(Ref ref) {
  ref.watch(authStateChangesProvider);
  return ref.watch(hostRepositoryProvider).fetchCurrentHost();
}

/// Whether a signUp() call left the user with an active session or still
/// waiting on "confirm your email" — Supabase returns success either way,
/// the only signal is whether `session` came back null.
enum AuthActionOutcome { signedIn, emailConfirmationRequired }

/// Drives the login/signup screens: exposes loading/error state for the
/// in-flight request without the screen needing its own StatefulWidget
/// state machine. On sign-in (or a signup that returns a session
/// immediately), there's no explicit navigation call — the router redirect
/// listens to [authStateChangesProvider] and moves the user forward on its
/// own once it fires.
@riverpod
class AuthController extends _$AuthController {
  @override
  FutureOr<AuthActionOutcome?> build() => null;

  Future<void> signIn({required String email, required String password}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(authRepositoryProvider).signIn(email: email, password: password);
      return AuthActionOutcome.signedIn;
    });
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final response = await ref
          .read(authRepositoryProvider)
          .signUp(email: email, password: password, fullName: fullName);
      return response.session == null
          ? AuthActionOutcome.emailConfirmationRequired
          : AuthActionOutcome.signedIn;
    });
  }

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).signOut();
    state = const AsyncData(null);
  }
}
