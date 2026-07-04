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

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    await ref.read(authControllerProvider.notifier).signUp(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          fullName: _fullNameController.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final loading = authState.isLoading;

    if (authState.value == AuthActionOutcome.emailConfirmationRequired) {
      return _EmailConfirmationPending(email: _emailController.text.trim());
    }

    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const AuthBrandHeader(subtitle: 'Crea il tuo account host'),
                  const SizedBox(height: 32),
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
                            label: 'Nome e cognome',
                            controller: _fullNameController,
                            textCapitalization: TextCapitalization.words,
                            autofillHints: const [AutofillHints.name],
                            validator: (value) {
                              if (value == null || value.trim().length < 2) {
                                return 'Inserisci il tuo nome completo';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
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
                            autofillHints: const [AutofillHints.newPassword],
                            validator: (value) {
                              if (value == null || value.length < 6) {
                                return 'Almeno 6 caratteri';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 28),
                          PrimaryButton(
                            label: loading ? 'Creazione account…' : 'Crea account',
                            loading: loading,
                            onPressed: _submit,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: loading ? null : () => context.pop(),
                    child: const Text('Hai già un account? Accedi'),
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

class _EmailConfirmationPending extends StatelessWidget {
  const _EmailConfirmationPending({required this.email});

  final String email;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AppCard(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.mark_email_read_outlined, size: 40, color: AppColors.gold),
                    const SizedBox(height: 16),
                    Text(
                      'Controlla la tua email',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      email.isEmpty
                          ? 'Ti abbiamo inviato un link di conferma. Aprilo per attivare il tuo account, poi torna qui per accedere.'
                          : 'Ti abbiamo inviato un link di conferma a $email. Aprilo per attivare il tuo account, poi torna qui per accedere.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.saltFaint, fontSize: 14, height: 1.5),
                    ),
                    const SizedBox(height: 24),
                    TextButton(
                      onPressed: () => context.go('/login'),
                      child: const Text('Torna al login'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
