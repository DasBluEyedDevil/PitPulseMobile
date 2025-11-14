import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../../../shared/utils/validators.dart';
import '../../../shared/utils/haptic_feedback.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) {
      await HapticFeedbackUtil.errorVibration();
      return;
    }

    await HapticFeedbackUtil.mediumImpact();
    setState(() => _isLoading = true);

    try {
      await ref.read(authStateProvider.notifier).login(
            _emailController.text.trim(),
            _passwordController.text,
          );
      await HapticFeedbackUtil.successVibration();
      // Navigation handled by router redirect
    } catch (e) {
      await HapticFeedbackUtil.errorVibration();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Login failed: ${e.toString()}'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppTheme.spacing24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: AppTheme.spacing64),
                
                // Logo/Title
                Semantics(
                  label: 'PitPulse logo',
                  image: true,
                  child: ExcludeSemantics(
                    child: Icon(
                      Icons.music_note,
                      size: 80,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
                const SizedBox(height: AppTheme.spacing16),
                
                Text(
                  'PitPulse',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        color: AppTheme.primary,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppTheme.spacing8),
                
                Text(
                  'Discover, Review, Connect',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppTheme.spacing48),
                
                // Email Field
                Semantics(
                  label: 'Email input field',
                  textField: true,
                  child: TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      hintText: 'Enter your email',
                      prefixIcon: Icon(Icons.email_outlined),
                    ),
                    validator: Validators.email,
                  ),
                ),
                const SizedBox(height: AppTheme.spacing16),
                
                // Password Field
                Semantics(
                  label: 'Password input field',
                  textField: true,
                  obscured: _obscurePassword,
                  child: TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    autofillHints: const [AutofillHints.password],
                    decoration: InputDecoration(
                      labelText: 'Password',
                      hintText: 'Enter your password',
                      prefixIcon: const Icon(Icons.lock_outlined),
                      suffixIcon: Semantics(
                        label: _obscurePassword ? 'Show password' : 'Hide password',
                        button: true,
                        child: IconButton(
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                          onPressed: () async {
                            await HapticFeedbackUtil.selectionClick();
                            setState(() => _obscurePassword = !_obscurePassword);
                          },
                        ),
                      ),
                    ),
                    validator: Validators.password,
                  ),
                ),
                const SizedBox(height: AppTheme.spacing24),
                
                // Login Button
                Semantics(
                  label: 'Login button',
                  button: true,
                  enabled: !_isLoading,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleLogin,
                    child: _isLoading
                        ? SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Text('Login'),
                  ),
                ),
                const SizedBox(height: AppTheme.spacing16),

                // Register Link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    Semantics(
                      label: 'Sign up button',
                      button: true,
                      child: TextButton(
                        onPressed: () async {
                          await HapticFeedbackUtil.lightImpact();
                          if (context.mounted) {
                            context.push('/register');
                          }
                        },
                        child: const Text('Sign Up'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
