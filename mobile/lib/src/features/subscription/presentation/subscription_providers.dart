import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/providers/providers.dart';
import '../../../core/services/analytics_service.dart';
import '../../../core/services/log_service.dart';
import '../data/subscription_repository.dart';
import '../domain/subscription_state.dart';
import 'subscription_service.dart';

part 'subscription_providers.g.dart';

/// Provider for the subscription repository
@Riverpod(keepAlive: true)
SubscriptionRepository subscriptionRepository(Ref ref) {
  final dioClient = ref.watch(dioClientProvider);
  return SubscriptionRepository(dioClient);
}

/// Provider for packages available for purchase
@riverpod
Future<List<Package>> packages(Ref ref) async {
  return SubscriptionService.getPackages();
}

/// Provider for the latest RevenueCat customer info.
@riverpod
Future<CustomerInfo?> revenueCatCustomerInfo(Ref ref) async {
  return SubscriptionService.getCustomerInfo();
}

/// Provider for server-side subscription status
@riverpod
Future<SubscriptionStatus> serverSubscriptionStatus(Ref ref) async {
  final repo = ref.watch(subscriptionRepositoryProvider);
  final result = await repo.getStatus();
  return result.fold(
    (failure) => throw Exception(failure.message),
    (status) => status,
  );
}

/// Notifier for client-side premium state
@Riverpod(keepAlive: true)
class IsPremium extends _$IsPremium {
  bool? _revenueCatEvidence;
  bool? _serverEvidence;
  int _sessionGeneration = 0;

  @override
  bool build() => false;

  void set(bool value) => state = value;

  int get sessionGeneration => _sessionGeneration;

  void beginSession() {
    _sessionGeneration++;
    _revenueCatEvidence = null;
    _serverEvidence = null;
    state = false;
  }

  void mergeEvidence({bool? revenueCat, bool? server}) {
    if (revenueCat != null) {
      _revenueCatEvidence = revenueCat;
    }
    if (server != null) {
      _serverEvidence = server;
    }

    if (_revenueCatEvidence == true || _serverEvidence == true) {
      state = true;
    } else if (_revenueCatEvidence == false && _serverEvidence == false) {
      state = false;
    }
  }

  Future<void> reconcileCustomerInfo(
    CustomerInfo customerInfo, {
    required int generation,
  }) async {
    if (generation != _sessionGeneration) return;
    mergeEvidence(
      revenueCat: SubscriptionService.hasUnlimitedEntitlement(customerInfo),
    );
    ref.invalidate(revenueCatCustomerInfoProvider);
    ref.invalidate(serverSubscriptionStatusProvider);

    try {
      final serverStatus = await ref.read(
        serverSubscriptionStatusProvider.future,
      );
      if (generation != _sessionGeneration) return;
      mergeEvidence(server: serverStatus.isPremium);
    } catch (error, stackTrace) {
      LogService.e('Failed to reconcile server entitlement', error, stackTrace);
    }
    if (generation != _sessionGeneration) return;

    try {
      await AnalyticsService.setUserProperty(
        name: 'plan',
        value: state ? 'premium' : 'free',
      );
    } catch (error, stackTrace) {
      LogService.e(
        'Failed to update subscription analytics',
        error,
        stackTrace,
      );
    }
  }
}
