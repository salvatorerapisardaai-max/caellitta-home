import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/error_banner.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/auth_repository.dart';
import '../providers/auth_providers.dart';
import 'auth_brand_header.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    await ref.read(authControllerProvider.notifier).signIn(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final loading = authState.isLoading;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const AuthBrandHeader(subtitle: 'Gestionale · Area Riservata'),
                  const SizedBox(height: 40),
                  AppCard(
                    padding: const EdgeInsets.all(28),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Container(
                            width: 32,
                            height: 1,
                            color: AppColors.gold.withValues(alpha: 0.5),
                            margin: const EdgeInsets.only(bottom: 24),
                          ),
                          if (authState.hasError) ...[
                            ErrorBanner(message: friendlyAuthError(authState.error!)),
                            const SizedBox(height: 16),
                          ],
                          AppTextField(
                            label: 'Email',
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            autofillHints: const [AutofillHints.email],
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Inserisci la tua email';
                              }
                              if (!value.contains('@') || !value.contains('.')) {
                                return 'Email non valida';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          AppTextField(
                            label: 'Password',
                            controller: _passwordController,
                            obscureText: true,
                            autofillHints: const [AutofillHints.password],
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Inserisci la password';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 28),
                          PrimaryButton(
                            label: loading ? 'Accesso in corso…' : 'Accedi',
                            loading: loading,
                            onPressed: _submit,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: loading ? null : () => context.push('/signup'),
                    child: const Text('Non hai un account? Registrati'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
