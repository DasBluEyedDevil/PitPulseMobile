import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/services/analytics_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/brand_widgets.dart';
import 'subscription_providers.dart';
import 'subscription_service.dart';

class ProFeatureScreen extends ConsumerStatefulWidget {
  const ProFeatureScreen({super.key});

  @override
  ConsumerState<ProFeatureScreen> createState() => _ProFeatureScreenState();
}

class _ProFeatureScreenState extends ConsumerState<ProFeatureScreen> {
  bool _isShowingPaywall = false;
  bool _isOpeningCustomerCenter = false;
  bool _isRestoring = false;

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  void initState() {
    super.initState();
    AnalyticsService.logEvent(name: 'subscription_viewed');
  }

  Future<void> _applyCustomerInfo(
    CustomerInfo customerInfo, {
    required int generation,
  }) {
    return ref
        .read(isPremiumProvider.notifier)
        .reconcileCustomerInfo(customerInfo, generation: generation);
  }

  int get _entitlementGeneration {
    return ref.read(isPremiumProvider.notifier).sessionGeneration;
  }

  Future<void> _refreshCustomerInfo({bool showSuccess = false}) async {
    final generation = _entitlementGeneration;
    final customerInfo = await SubscriptionService.getCustomerInfo();
    if (!mounted || customerInfo == null) return;

    await _applyCustomerInfo(customerInfo, generation: generation);
    if (!mounted) return;
    if (showSuccess &&
        SubscriptionService.hasUnlimitedEntitlement(customerInfo)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('SoundCheck Unlimited unlocked')),
      );
    }
  }

  Future<void> _onShowPaywall() async {
    setState(() => _isShowingPaywall = true);
    try {
      AnalyticsService.logEvent(name: 'paywall_viewed');
      final result =
          await SubscriptionService.presentUnlimitedPaywallIfNeeded();
      if (!mounted) return;

      switch (result) {
        case PaywallResult.purchased:
          AnalyticsService.logEvent(name: 'subscription_started');
          await _refreshCustomerInfo(showSuccess: true);
        case PaywallResult.restored:
          AnalyticsService.logEvent(name: 'subscription_restored');
          await _refreshCustomerInfo(showSuccess: true);
        case PaywallResult.notPresented:
          await _refreshCustomerInfo();
        case PaywallResult.cancelled:
          break;
        case PaywallResult.error:
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not open subscription options'),
            ),
          );
      }
    } finally {
      if (mounted) setState(() => _isShowingPaywall = false);
    }
  }

  Future<void> _onRestore() async {
    setState(() => _isRestoring = true);
    try {
      final generation = _entitlementGeneration;
      final customerInfo = await SubscriptionService.restorePurchases();
      if (!mounted) return;

      if (customerInfo == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No previous purchases found')),
        );
        return;
      }

      await _applyCustomerInfo(customerInfo, generation: generation);
      if (!mounted) return;
      if (SubscriptionService.hasUnlimitedEntitlement(customerInfo)) {
        AnalyticsService.logEvent(name: 'subscription_restored');
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Purchases restored')));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No active subscription found')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRestoring = false);
    }
  }

  Future<void> _onOpenCustomerCenter() async {
    setState(() => _isOpeningCustomerCenter = true);
    try {
      final generation = _entitlementGeneration;
      await SubscriptionService.presentCustomerCenter(
        onRestoreCompleted: (customerInfo) {
          if (!mounted) return;
          unawaited(_applyCustomerInfo(customerInfo, generation: generation));
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Purchases restored')));
        },
        onPromotionalOfferSucceeded: (customerInfo, _, _) {
          if (!mounted) return;
          unawaited(_applyCustomerInfo(customerInfo, generation: generation));
        },
      );
      await _refreshCustomerInfo();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open Customer Center')),
        );
      }
    } finally {
      if (mounted) setState(() => _isOpeningCustomerCenter = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isPremium = ref.watch(isPremiumProvider);
    final serverSubscriptionStatus = ref.watch(
      serverSubscriptionStatusProvider,
    );
    final serverIsPremium = serverSubscriptionStatus.asData?.value.isPremium;
    final isSyncingPremium = isPremium && serverIsPremium != true;
    final packagesAsync = ref.watch(packagesProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(SubscriptionService.entitlementDisplayName),
        backgroundColor: Colors.transparent,
      ),
      body: BrandGradientBackground(
        heroAsset: AppTheme.profileBackdropAsset,
        heroOpacity: 0.3,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const BrandLogoImage(
                asset: AppTheme.markSquareAsset,
                height: 96,
                semanticLabel: 'SoundCheck Unlimited mark',
              ),
              const SizedBox(height: 16),
              const Text(
                SubscriptionService.entitlementDisplayName,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.voltLime,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                isPremium
                    ? isSyncingPremium
                          ? 'Your purchase is syncing. Unlimited access may take a moment.'
                          : "You're an Unlimited member."
                    : 'Unlock the full concert experience.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 32),
              const _PerkCard(
                icon: Icons.analytics_outlined,
                title: 'Detailed Wrapped analytics',
                description:
                    'Monthly breakdown, genre evolution, and friend overlap.',
              ),
              const _PerkCard(
                icon: Icons.share_outlined,
                title: 'Per-stat share cards',
                description: 'Share individual Wrapped stats to social.',
              ),
              const _PerkCard(
                icon: Icons.history,
                title: 'Wrapped archive',
                description: "Browse previous years' Wrapped.",
              ),
              const _PerkCard(
                icon: Icons.insights,
                title: 'Year-round analytics',
                description: 'Detailed concert analytics anytime.',
              ),
              const SizedBox(height: 28),
              if (!isPremium) ...[
                _AvailablePlans(packagesAsync: packagesAsync),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isShowingPaywall ? null : _onShowPaywall,
                    child: _isShowingPaywall
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Theme.of(context).scaffoldBackgroundColor,
                            ),
                          )
                        : const Text('View plans'),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  style: TextButton.styleFrom(minimumSize: const Size(0, 44)),
                  onPressed: _isRestoring ? null : _onRestore,
                  child: Text(
                    _isRestoring ? 'Restoring...' : 'Restore purchases',
                  ),
                ),
              ] else ...[
                Icon(
                  Icons.check_circle,
                  color: isSyncingPremium
                      ? AppTheme.textSecondary
                      : AppTheme.voltLime,
                  size: 48,
                ),
                const SizedBox(height: 8),
                Text(
                  isSyncingPremium
                      ? 'Waiting for backend confirmation before unlocking server-gated features.'
                      : 'All Unlimited features are unlocked.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: _isOpeningCustomerCenter
                      ? null
                      : _onOpenCustomerCenter,
                  icon: const Icon(Icons.manage_accounts_outlined),
                  label: Text(
                    _isOpeningCustomerCenter
                        ? 'Opening...'
                        : 'Manage subscription',
                  ),
                ),
              ],
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextButton(
                    onPressed: () => _launchUrl('https://soundcheck.app/terms'),
                    child: const Text(
                      'Terms of Service',
                      style: TextStyle(fontSize: 14),
                    ),
                  ),
                  const Text(
                    ' | ',
                    style: TextStyle(color: AppTheme.textTertiary),
                  ),
                  TextButton(
                    onPressed: () =>
                        _launchUrl('https://soundcheck.app/privacy'),
                    child: const Text(
                      'Privacy Policy',
                      style: TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AvailablePlans extends StatelessWidget {
  const _AvailablePlans({required this.packagesAsync});

  final AsyncValue<List<Package>> packagesAsync;

  @override
  Widget build(BuildContext context) {
    return packagesAsync.when(
      data: (packages) {
        if (packages.isEmpty) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Plans are configured in RevenueCat and will appear here when available.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textSecondary),
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Available plans',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            ...packages.map((package) => _PlanRow(package: package)),
          ],
        );
      },
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: CircularProgressIndicator(color: AppTheme.voltLime),
        ),
      ),
      error: (e, _) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'Could not load plans: $e',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppTheme.error),
        ),
      ),
    );
  }
}

class _PlanRow extends StatelessWidget {
  const _PlanRow({required this.package});

  final Package package;

  String get _name {
    final productId = package.storeProduct.identifier;
    if (package.packageType == PackageType.lifetime ||
        productId == SubscriptionService.productLifetime) {
      return 'Lifetime';
    }
    if (package.packageType == PackageType.annual ||
        productId == SubscriptionService.productYearly) {
      return 'Yearly';
    }
    if (package.packageType == PackageType.monthly ||
        productId == SubscriptionService.productMonthly) {
      return 'Monthly';
    }
    return package.storeProduct.title;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.voltLime.withValues(alpha: 0.18)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _name,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                package.storeProduct.priceString,
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PerkCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _PerkCard({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.voltLime, size: 28),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
