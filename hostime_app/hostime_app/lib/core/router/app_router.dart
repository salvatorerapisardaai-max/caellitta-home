import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/signup_screen.dart';
import '../../features/onboarding/presentation/onboarding_wizard_screen.dart';
import '../../features/properties/presentation/properties_list_screen.dart';
import '../../features/properties/presentation/property_detail_screen.dart';
import '../../features/properties/data/property.dart';
import '../../features/properties/presentation/property_form_screen.dart';
import '../../features/properties/providers/property_providers.dart';
import '../../features/splash/presentation/splash_screen.dart';
import '../supabase/supabase_providers.dart';

part 'app_router.g.dart';

/// Turns riverpod provider updates into a [Listenable] go_router can use as
/// its `refreshListenable`, so a redirect is re-evaluated whenever auth
/// state or the properties list changes — not just on navigation.
class _RouterRefreshNotifier extends ChangeNotifier {
  void notify() => notifyListeners();
}

const _authRoutes = {'/login', '/signup'};

@Riverpod(keepAlive: true)
GoRouter router(Ref ref) {
  final refresh = _RouterRefreshNotifier();
  ref.listen(authStateChangesProvider, (_, _) => refresh.notify());
  ref.listen(propertiesListProvider, (_, _) => refresh.notify());
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final loggedIn = ref.read(supabaseClientProvider).auth.currentSession != null;
      final goingToAuth = _authRoutes.contains(state.matchedLocation);
      final onSplash = state.matchedLocation == '/splash';

      if (!loggedIn) {
        return goingToAuth ? null : '/login';
      }

      if (goingToAuth) {
        // Signed in but still sitting on /login or /signup (e.g. browser
        // back button) — send through splash to resolve where to land.
        return '/splash';
      }

      if (!onSplash) return null;

      final propertiesState = ref.read(propertiesListProvider);
      return propertiesState.when(
        data: (properties) {
          if (properties.isEmpty) return '/onboarding';
          if (properties.length == 1) return '/properties/${properties.first.id}';
          return '/properties';
        },
        loading: () => null,
        error: (_, _) => null,
      );
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (context, state) => const SignupScreen()),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingWizardScreen(),
      ),
      GoRoute(
        path: '/properties',
        builder: (context, state) => const PropertiesListScreen(),
      ),
      GoRoute(
        path: '/properties/new',
        builder: (context, state) => const PropertyFormScreen(),
      ),
      GoRoute(
        path: '/properties/:id',
        builder: (context, state) =>
            PropertyDetailScreen(propertyId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/properties/:id/edit',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          final properties = ref.read(propertiesListProvider).value ?? const <Property>[];
          Property? existing;
          for (final p in properties) {
            if (p.id == id) {
              existing = p;
              break;
            }
          }
          return PropertyFormScreen(existing: existing);
        },
      ),
    ],
  );
}
