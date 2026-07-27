import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/core/api/dio_client.dart';
import 'package:soundcheck_flutter/src/core/error/failures.dart';
import 'package:soundcheck_flutter/src/core/providers/providers.dart';
import 'package:soundcheck_flutter/src/features/auth/presentation/forgot_password_screen.dart';
import 'package:soundcheck_flutter/src/features/auth/presentation/reset_password_screen.dart';

const _validToken = '0123456789abcdef0123456789abcdef';

void main() {
  Widget app(Widget home, _RecoveryDioClient client) {
    return ProviderScope(
      overrides: [dioClientProvider.overrideWithValue(client)],
      child: MaterialApp(home: home),
    );
  }

  group('ForgotPasswordScreen', () {
    testWidgets('renders the request form and validates email', (tester) async {
      final client = _RecoveryDioClient();
      await tester.pumpWidget(app(const ForgotPasswordScreen(), client));

      expect(find.text('Reset your password'), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'Email'), findsOneWidget);

      await tester.tap(find.text('Send Reset Link'));
      await tester.pump();
      expect(find.text('Email is required'), findsOneWidget);

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'not-an-email',
      );
      await tester.tap(find.text('Send Reset Link'));
      await tester.pump();
      expect(find.text('Please enter a valid email'), findsOneWidget);
      expect(client.requests, isEmpty);
    });

    testWidgets('submits a trimmed email and renders the server response', (
      tester,
    ) async {
      final client = _RecoveryDioClient(
        responseData: {
          'data': {'message': 'A safe response from the server'},
        },
      );
      await tester.pumpWidget(app(const ForgotPasswordScreen(), client));

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        '  listener@example.com  ',
      );
      await tester.tap(find.text('Send Reset Link'));
      await tester.pumpAndSettle();

      expect(client.requests.single.path, '/auth/forgot-password');
      expect(client.requests.single.data, {'email': 'listener@example.com'});
      expect(find.text('Check your inbox'), findsOneWidget);
      expect(find.text('A safe response from the server'), findsOneWidget);
      expect(find.text('Back to Login'), findsOneWidget);
    });

    testWidgets('uses an enumeration-safe fallback for an empty response', (
      tester,
    ) async {
      final client = _RecoveryDioClient(
        responseData: const <String, dynamic>{},
      );
      await tester.pumpWidget(app(const ForgotPasswordScreen(), client));

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'listener@example.com',
      );
      await tester.tap(find.text('Send Reset Link'));
      await tester.pumpAndSettle();

      expect(
        find.text(
          "If an account exists for that email, we've sent a reset link. Check your inbox.",
        ),
        findsOneWidget,
      );
    });

    testWidgets('normalizes a rate-limit failure and allows retry', (
      tester,
    ) async {
      final client = _RecoveryDioClient(
        failure: const RateLimitFailure('Too many reset attempts'),
      );
      await tester.pumpWidget(app(const ForgotPasswordScreen(), client));

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'listener@example.com',
      );
      await tester.tap(find.text('Send Reset Link'));
      await tester.pumpAndSettle();

      expect(
        find.text('Too many requests. Please try again later.'),
        findsOneWidget,
      );
      expect(find.text('Send Reset Link'), findsOneWidget);
    });

    testWidgets('surfaces a classified non-rate-limit failure', (tester) async {
      final client = _RecoveryDioClient(
        failure: const NetworkFailure('Network unavailable'),
      );
      await tester.pumpWidget(app(const ForgotPasswordScreen(), client));

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'listener@example.com',
      );
      await tester.tap(find.text('Send Reset Link'));
      await tester.pumpAndSettle();

      expect(find.text('Network unavailable'), findsOneWidget);
    });
  });

  group('ResetPasswordScreen', () {
    testWidgets('rejects missing, malformed, and non-v4 reset tokens', (
      tester,
    ) async {
      for (final token in [
        '',
        'not-a-token',
        '11111111-1111-1111-8111-111111111111',
      ]) {
        await tester.pumpWidget(
          app(ResetPasswordScreen(token: token), _RecoveryDioClient()),
        );
        expect(find.text('Invalid Reset Link'), findsOneWidget);
        expect(find.text('Back to Login'), findsOneWidget);
        expect(find.text('Create new password'), findsNothing);
      }
    });

    testWidgets('accepts a UUID-v4 token and toggles both password fields', (
      tester,
    ) async {
      await tester.pumpWidget(
        app(
          const ResetPasswordScreen(
            token: '11111111-1111-4111-8111-111111111111',
          ),
          _RecoveryDioClient(),
        ),
      );

      expect(find.text('Create new password'), findsOneWidget);
      final fields = find.byType(TextField);
      expect(fields, findsNWidgets(2));
      expect(tester.widget<TextField>(fields.at(0)).obscureText, isTrue);
      expect(tester.widget<TextField>(fields.at(1)).obscureText, isTrue);

      final firstToggle = find.descendant(
        of: find.widgetWithText(TextFormField, 'New Password'),
        matching: find.byType(IconButton),
      );
      final secondToggle = find.descendant(
        of: find.widgetWithText(TextFormField, 'Confirm Password'),
        matching: find.byType(IconButton),
      );
      await tester.tap(firstToggle);
      await tester.tap(secondToggle);
      await tester.pump();

      expect(tester.widget<TextField>(fields.at(0)).obscureText, isFalse);
      expect(tester.widget<TextField>(fields.at(1)).obscureText, isFalse);
    });

    testWidgets('validates password strength and confirmation', (tester) async {
      final client = _RecoveryDioClient();
      await tester.pumpWidget(
        app(const ResetPasswordScreen(token: _validToken), client),
      );

      await tester.enterText(
        find.widgetWithText(TextFormField, 'New Password'),
        'short',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'different',
      );
      final submit = find.widgetWithText(ElevatedButton, 'Reset Password');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pump();

      expect(
        find.text('Password must be at least 8 characters'),
        findsOneWidget,
      );
      expect(find.text('Passwords do not match'), findsOneWidget);
      expect(client.requests, isEmpty);
    });

    testWidgets('submits a strong password and renders success', (
      tester,
    ) async {
      final client = _RecoveryDioClient();
      await tester.pumpWidget(
        app(const ResetPasswordScreen(token: _validToken), client),
      );

      await tester.enterText(
        find.widgetWithText(TextFormField, 'New Password'),
        'StrongPassword1!',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'StrongPassword1!',
      );
      final submit = find.widgetWithText(ElevatedButton, 'Reset Password');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();

      expect(client.requests.single.path, '/auth/reset-password');
      expect(client.requests.single.data, {
        'token': _validToken,
        'newPassword': 'StrongPassword1!',
      });
      expect(find.text('Password Reset Successfully'), findsOneWidget);
      expect(find.text('Log in with New Password'), findsOneWidget);
    });

    testWidgets('maps expired-token failures and restores the form', (
      tester,
    ) async {
      final client = _RecoveryDioClient(
        failure: const AuthFailure('Reset token expired'),
      );
      await tester.pumpWidget(
        app(const ResetPasswordScreen(token: _validToken), client),
      );

      await tester.enterText(
        find.widgetWithText(TextFormField, 'New Password'),
        'StrongPassword1!',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'StrongPassword1!',
      );
      final submit = find.widgetWithText(ElevatedButton, 'Reset Password');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();

      expect(
        find.text(
          'This reset link has expired or is invalid. Please request a new one.',
        ),
        findsOneWidget,
      );
      expect(
        find.widgetWithText(ElevatedButton, 'Reset Password'),
        findsOneWidget,
      );
    });
  });
}

class _RecoveryRequest {
  const _RecoveryRequest(this.path, this.data);

  final String path;
  final dynamic data;
}

class _RecoveryDioClient extends DioClient {
  _RecoveryDioClient({
    this.responseData = const <String, dynamic>{},
    this.failure,
  }) : super(secureStorage: const FlutterSecureStorage());

  final dynamic responseData;
  final Failure? failure;
  final requests = <_RecoveryRequest>[];

  @override
  Future<Response<dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    requests.add(_RecoveryRequest(path, data));
    if (failure case final failure?) {
      throw failure;
    }
    return Response<dynamic>(
      requestOptions: RequestOptions(path: path),
      data: responseData,
      statusCode: 200,
    );
  }
}
