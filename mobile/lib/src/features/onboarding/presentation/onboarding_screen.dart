import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/brand_widgets.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<_OnboardingPage> _pages = [
    const _OnboardingPage(
      title: 'Live music. Real connection.',
      description:
          'Check in. Share the moment. Relive every beat with the people who were there.',
      imageAsset: AppTheme.flashStageMarkPortraitAsset,
      imageSemanticLabel: 'SoundCheck concert stage hero',
    ),
    const _OnboardingPage(
      title: 'Build your live resume.',
      description:
          'Rate the set, collect badges, and keep a premium record of every show.',
      imageAsset: AppTheme.flashPrismPortraitAsset,
      imageSemanticLabel: 'Neon prism concert artwork',
    ),
    const _OnboardingPage(
      title: 'Find the next wave.',
      description:
          'See nearby shows, friend check-ins, and trending nights before they pass you by.',
      imageAsset: AppTheme.flashWavePanoramaAsset,
      imageSemanticLabel: 'Neon waveform concert artwork',
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  /// Skip onboarding entirely -- sets local pref and goes to login.
  /// Does NOT call backend API (user isn't logged in yet).
  Future<void> _finishOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('hasSeenOnboarding', true);

    if (mounted) {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: BrandGradientBackground(
        heroAsset: AppTheme.onboardingBackdropAsset,
        heroOpacity: 0.58,
        heroAlignment: Alignment.topCenter,
        child: SafeArea(
          child: Column(
            children: [
              // Skip button in top-right corner
              Align(
                alignment: Alignment.centerRight,
                child: Padding(
                  padding: const EdgeInsets.only(
                    top: AppTheme.spacing8,
                    right: AppTheme.spacing16,
                  ),
                  child: TextButton(
                    onPressed: _finishOnboarding,
                    child: const Text(
                      'Skip',
                      style: TextStyle(color: AppTheme.textSecondary),
                    ),
                  ),
                ),
              ),

              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: _pages.length,
                  onPageChanged: (index) {
                    setState(() => _currentPage = index);
                  },
                  itemBuilder: (context, index) {
                    return _OnboardingContent(page: _pages[index]);
                  },
                ),
              ),

              // Indicators and Controls
              Padding(
                padding: const EdgeInsets.all(AppTheme.spacing24),
                child: Column(
                  children: [
                    // Page Indicators
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        _pages.length,
                        (index) => AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          height: 8,
                          width: _currentPage == index ? 24 : 8,
                          decoration: BoxDecoration(
                            color: _currentPage == index
                                ? AppTheme.primary
                                : AppTheme.textSecondary.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    NeonGradientButton(
                      onPressed: () {
                        if (_currentPage < _pages.length - 1) {
                          _pageController.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeIn,
                          );
                        } else {
                          context.go('/onboarding/genres');
                        }
                      },
                      label: _currentPage == _pages.length - 1
                          ? 'Get Started'
                          : 'Next',
                    ),
                    const SizedBox(height: AppTheme.spacing16),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardingPage {
  final String title;
  final String description;
  final String imageAsset;
  final String imageSemanticLabel;

  const _OnboardingPage({
    required this.title,
    required this.description,
    required this.imageAsset,
    required this.imageSemanticLabel,
  });
}

class _OnboardingContent extends StatelessWidget {
  final _OnboardingPage page;

  const _OnboardingContent({required this.page});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxHeight < 720;
        final horizontalPadding = compact
            ? AppTheme.spacing24
            : AppTheme.spacing32;
        final heroHeight = compact ? 260.0 : 330.0;
        final contentGap = compact ? AppTheme.spacing24 : AppTheme.spacing32;

        return SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Padding(
              padding: EdgeInsets.all(horizontalPadding),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const BrandLogoImage(height: 86),
                  SizedBox(height: compact ? AppTheme.spacing16 : 22),
                  NeonGlassPanel(
                    padding: EdgeInsets.zero,
                    borderRadius: AppTheme.radiusXLarge,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(
                        AppTheme.radiusXLarge,
                      ),
                      child: SizedBox(
                        height: heroHeight,
                        child: Image.asset(
                          page.imageAsset,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          semanticLabel: page.imageSemanticLabel,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: contentGap),
                  Text(
                    page.title,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppTheme.spacing16),
                  Text(
                    page.description,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppTheme.textSecondary,
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
