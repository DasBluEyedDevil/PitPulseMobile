import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundcheck_flutter/src/features/checkins/domain/checkin.dart';
import 'package:soundcheck_flutter/src/features/checkins/presentation/photo_upload_sheet.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PhotoUploadSheet', () {
    testWidgets('exposes camera and gallery actions with accessible labels', (
      tester,
    ) async {
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(
        _app(
          const PhotoUploadSheet(
            checkinId: 'checkin-1',
            onComplete: _ignoreCompletion,
          ),
        ),
      );

      expect(find.text('Add Photos (0/4)'), findsOneWidget);
      expect(find.text('Camera'), findsOneWidget);
      expect(find.text('Gallery'), findsOneWidget);
      expect(_semanticsLabel('Add photo from Camera'), findsOneWidget);
      expect(_semanticsLabel('Add photo from Gallery'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Skip'), findsOneWidget);
      semantics.dispose();
    });

    testWidgets('camera permission/plugin errors stay visible and retryable', (
      tester,
    ) async {
      _failImagePickerWithPermissionDenied();
      addTearDown(_resetImagePicker);
      await tester.pumpWidget(
        _app(
          const PhotoUploadSheet(
            checkinId: 'checkin-1',
            onComplete: _ignoreCompletion,
          ),
        ),
      );

      await tester.tap(find.text('Camera'));
      await tester.pumpAndSettle();

      expect(
        find.text('Failed to take photo. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Camera'), findsOneWidget);
      expect(find.text('Gallery'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Skip'), findsOneWidget);
    });

    testWidgets('gallery permission/plugin errors stay visible and retryable', (
      tester,
    ) async {
      _failImagePickerWithPermissionDenied();
      addTearDown(_resetImagePicker);
      await tester.pumpWidget(
        _app(
          const PhotoUploadSheet(
            checkinId: 'checkin-1',
            onComplete: _ignoreCompletion,
          ),
        ),
      );

      await tester.tap(find.text('Gallery'));
      await tester.pumpAndSettle();

      expect(
        find.text('Failed to pick image. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Camera'), findsOneWidget);
      expect(find.text('Gallery'), findsOneWidget);
    });

    testWidgets('full check-in does not offer an over-limit picker action', (
      tester,
    ) async {
      await tester.pumpWidget(
        _app(
          const PhotoUploadSheet(
            checkinId: 'checkin-1',
            existingPhotoCount: 4,
            onComplete: _ignoreCompletion,
          ),
        ),
      );

      expect(find.text('Add Photos (4/4)'), findsOneWidget);
      expect(find.text('Camera'), findsNothing);
      expect(find.text('Gallery'), findsNothing);
      expect(find.widgetWithText(ElevatedButton, 'Skip'), findsOneWidget);
    });

    testWidgets('skip closes the modal without invoking upload completion', (
      tester,
    ) async {
      var completions = 0;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => ElevatedButton(
                  onPressed: () {
                    showModalBottomSheet<void>(
                      context: context,
                      builder: (_) => PhotoUploadSheet(
                        checkinId: 'checkin-1',
                        onComplete: (_) => completions++,
                      ),
                    );
                  },
                  child: const Text('Add photos'),
                ),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Add photos'));
      await tester.pumpAndSettle();
      expect(find.text('Add Photos (0/4)'), findsOneWidget);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Skip'));
      await tester.pumpAndSettle();

      expect(find.text('Add Photos (0/4)'), findsNothing);
      expect(find.text('Add photos'), findsOneWidget);
      expect(completions, 0);
    });
  });
}

Widget _app(Widget child) {
  return ProviderScope(
    child: MaterialApp(home: Scaffold(body: child)),
  );
}

void _ignoreCompletion(CheckIn _) {}

Finder _semanticsLabel(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is Semantics && widget.properties.label == label,
  );
}

const _imagePickerChannel = MethodChannel('plugins.flutter.io/image_picker');

void _failImagePickerWithPermissionDenied() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_imagePickerChannel, (_) async {
        throw PlatformException(
          code: 'camera_access_denied',
          message: 'Permission denied for this test',
        );
      });
}

void _resetImagePicker() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_imagePickerChannel, null);
}
