import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pitpulse_flutter/src/features/auth/presentation/login_screen.dart';

void main() {
  group('LoginScreen Widget', () {
    testWidgets('displays all required UI elements', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      // Check for logo/icon
      expect(find.byIcon(Icons.music_note), findsOneWidget);
      
      // Check for app name
      expect(find.text('PitPulse'), findsOneWidget);
      
      // Check for tagline
      expect(find.text('Discover, Review, Connect'), findsOneWidget);
      
      // Check for email field
      expect(find.widgetWithText(TextFormField, 'Email'), findsOneWidget);
      
      // Check for password field
      expect(find.widgetWithText(TextFormField, 'Password'), findsOneWidget);
      
      // Check for login button
      expect(find.widgetWithText(ElevatedButton, 'Login'), findsOneWidget);
      
      // Check for sign up link
      expect(find.text("Don't have an account? "), findsOneWidget);
      expect(find.widgetWithText(TextButton, 'Sign Up'), findsOneWidget);
    });

    testWidgets('email field has correct keyboard type', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      final emailField = tester.widget<TextFormField>(
        find.widgetWithText(TextFormField, 'Email'),
      );
      
      expect(emailField.keyboardType, TextInputType.emailAddress);
    });

    testWidgets('password field is initially obscured', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      final passwordField = tester.widget<TextFormField>(
        find.widgetWithText(TextFormField, 'Password'),
      );
      
      expect(passwordField.obscureText, true);
    });

    testWidgets('can toggle password visibility', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      // Find the password field
      final passwordFieldFinder = find.widgetWithText(TextFormField, 'Password');
      
      // Initially obscured
      var passwordField = tester.widget<TextFormField>(passwordFieldFinder);
      expect(passwordField.obscureText, true);
      
      // Find and tap the visibility toggle button
      final visibilityIcon = find.descendant(
        of: passwordFieldFinder,
        matching: find.byType(IconButton),
      );
      await tester.tap(visibilityIcon);
      await tester.pumpAndSettle();
      
      // Now should be visible
      passwordField = tester.widget<TextFormField>(passwordFieldFinder);
      expect(passwordField.obscureText, false);
    });

    testWidgets('validates empty email field', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      // Tap login button without entering any data
      await tester.tap(find.widgetWithText(ElevatedButton, 'Login'));
      await tester.pumpAndSettle();

      // Should show validation error
      expect(find.text('Email is required'), findsOneWidget);
    });

    testWidgets('validates invalid email format', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      // Enter invalid email
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'notanemail',
      );
      
      // Tap login button
      await tester.tap(find.widgetWithText(ElevatedButton, 'Login'));
      await tester.pumpAndSettle();

      // Should show validation error
      expect(find.text('Please enter a valid email'), findsOneWidget);
    });

    testWidgets('validates empty password field', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      // Enter valid email but no password
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      
      // Tap login button
      await tester.tap(find.widgetWithText(ElevatedButton, 'Login'));
      await tester.pumpAndSettle();

      // Should show password validation error
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('validates password minimum length', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      // Enter valid email but short password
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        '12345',
      );
      
      // Tap login button
      await tester.tap(find.widgetWithText(ElevatedButton, 'Login'));
      await tester.pumpAndSettle();

      // Should show password validation error
      expect(find.text('Password must be at least 6 characters'), findsOneWidget);
    });

    testWidgets('accepts valid email and password', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      // Enter valid credentials
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      
      // Tap login button
      await tester.tap(find.widgetWithText(ElevatedButton, 'Login'));
      await tester.pump();

      // Should not show validation errors
      expect(find.text('Email is required'), findsNothing);
      expect(find.text('Please enter a valid email'), findsNothing);
      expect(find.text('Password is required'), findsNothing);
      expect(find.text('Password must be at least 6 characters'), findsNothing);
    });
  });
}
