import 'package:firebase_core/firebase_core.dart';

import '../../../firebase_options.dart';
import 'log_service.dart';

class FirebaseBootstrap {
  FirebaseBootstrap._();

  static Future<bool> ensureInitialized() async {
    if (Firebase.apps.isNotEmpty) {
      return true;
    }

    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      return true;
    } on FirebaseNotConfigured catch (e) {
      LogService.w(e.toString());
      return false;
    } on FirebaseException catch (e, stack) {
      if (e.code == 'duplicate-app' || e.code == 'core/duplicate-app') {
        LogService.w('Firebase default app already exists; reusing it.');
        return true;
      }
      LogService.e('Firebase initialization failed', e, stack);
      return false;
    } catch (e, stack) {
      LogService.e('Firebase initialization failed', e, stack);
      return false;
    }
  }
}
