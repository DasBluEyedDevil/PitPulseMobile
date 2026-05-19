import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('firebase_options.dart does not commit Google API key literals', () {
    final source = File('lib/firebase_options.dart').readAsStringSync();

    expect(source, isNot(matches(RegExp(r'AIza[0-9A-Za-z_-]+'))));
  });
}
