import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/supabase/secure_local_storage.dart';
import 'core/theme/app_colors.dart';
import 'core/utils/env_config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // .env is optional when SUPABASE_URL/SUPABASE_ANON_KEY are provided via
    // --dart-define instead (e.g. CI/release builds).
  }

  if (!EnvConfig.isConfigured) {
    runApp(const _MissingConfigApp());
    return;
  }

  await Supabase.initialize(
    url: EnvConfig.supabaseUrl,
    publishableKey: EnvConfig.supabaseAnonKey,
    authOptions: FlutterAuthClientOptions(localStorage: SecureLocalStorage()),
  );

  runApp(const ProviderScope(child: HosTimeApp()));
}

/// Shown instead of a crash when SUPABASE_URL / SUPABASE_ANON_KEY are
/// missing, so a misconfigured build fails loudly and clearly rather than
/// with a raw exception.
class _MissingConfigApp extends StatelessWidget {
  const _MissingConfigApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(brightness: Brightness.dark, scaffoldBackgroundColor: AppColors.lava),
      home: const Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Text(
              'Configurazione mancante: copia .env.example in .env e inserisci '
              'SUPABASE_URL e SUPABASE_ANON_KEY (oppure passali con --dart-define).',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.salt),
            ),
          ),
        ),
      ),
    );
  }
}
