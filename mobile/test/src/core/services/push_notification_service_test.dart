import 'package:flutter_test/flutter_test.dart';

import 'package:soundcheck_flutter/src/core/services/push_notification_service.dart';

void main() {
  group('PushNotificationService deep-link parsing', () {
    late PushNotificationService service;

    setUp(() {
      service = PushNotificationService();
    });

    tearDown(() async {
      await service.dispose();
    });

    test('accepts internal deepLink routes', () {
      expect(service.parseDeepLink({'deepLink': '/feed'}), '/feed');
      expect(
        service.parseDeepLink({'deepLink': '/checkins/checkin-123'}),
        '/checkins/checkin-123',
      );
      expect(
        service.parseDeepLink({'deepLink': '/notifications?tab=activity'}),
        '/notifications?tab=activity',
      );
    });

    test('rejects external and unknown deepLink routes', () {
      expect(
        service.parseDeepLink({'deepLink': 'https://example.com/feed'}),
        isNull,
      );
      expect(service.parseDeepLink({'deepLink': '//example.com/feed'}), isNull);
      expect(service.parseDeepLink({'deepLink': '/admin/users'}), isNull);
      expect(service.parseDeepLink({'deepLink': 'feed'}), isNull);
    });

    test('builds internal routes from compatibility entity ids', () {
      expect(
        service.parseDeepLink({'notificationId': 'notification-123'}),
        '/notifications/notification-123',
      );
      expect(
        service.parseDeepLink({'checkinId': 'checkin-123'}),
        '/checkins/checkin-123',
      );
      expect(service.parseDeepLink({'bandId': 'band-123'}), '/bands/band-123');
      expect(
        service.parseDeepLink({'venueId': 'venue-123'}),
        '/venues/venue-123',
      );
      expect(service.parseDeepLink({'userId': 'user-123'}), '/users/user-123');
      expect(
        service.parseDeepLink({'eventId': 'event-123'}),
        '/events/event-123',
      );
      expect(service.parseDeepLink({'showId': 'show-123'}), '/events/show-123');
    });
  });
}
