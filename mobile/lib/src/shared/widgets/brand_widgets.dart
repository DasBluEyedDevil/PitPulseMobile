import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class BrandGradientBackground extends StatelessWidget {
  const BrandGradientBackground({
    required this.child,
    super.key,
    this.heroAsset = AppTheme.stageTextureAsset,
    this.heroOpacity = 0.34,
    this.heroAlignment = Alignment.center,
    this.showBrandImage = true,
  });

  final Widget child;
  final String heroAsset;
  final double heroOpacity;
  final Alignment heroAlignment;
  final bool showBrandImage;

  @override
  Widget build(BuildContext context) {
    return FlashStageBackground(
      asset: showBrandImage ? heroAsset : null,
      opacity: heroOpacity,
      alignment: heroAlignment,
      child: child,
    );
  }
}

class FlashStageBackground extends StatelessWidget {
  const FlashStageBackground({
    required this.child,
    super.key,
    this.asset,
    this.opacity = 0.42,
    this.alignment = Alignment.center,
    this.fit = BoxFit.cover,
  });

  final Widget child;
  final String? asset;
  final double opacity;
  final Alignment alignment;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: AppTheme.stageGradient),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (asset != null)
            IgnorePointer(
              child: ExcludeSemantics(
                child: Opacity(
                  opacity: opacity,
                  child: Image.asset(asset!, fit: fit, alignment: alignment),
                ),
              ),
            ),
          const IgnorePointer(child: _FlashEdgeScrim()),
          const IgnorePointer(child: _StageLightWash()),
          child,
        ],
      ),
    );
  }
}

class BrandLogoImage extends StatelessWidget {
  const BrandLogoImage({
    super.key,
    this.asset = AppTheme.flashWordmarkAsset,
    this.height = 112,
    this.fit = BoxFit.contain,
    this.alignment = Alignment.center,
    this.semanticLabel = 'SoundCheck logo',
  });

  final String asset;
  final double height;
  final BoxFit fit;
  final Alignment alignment;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      image: true,
      child: Image.asset(
        asset,
        height: height,
        fit: fit,
        alignment: alignment,
        errorBuilder: (context, error, stackTrace) => Image.asset(
          AppTheme.flashMarkAsset,
          height: height * 0.72,
          fit: BoxFit.contain,
          semanticLabel: semanticLabel,
        ),
      ),
    );
  }
}

class GlassPanel extends StatelessWidget {
  const GlassPanel({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(AppTheme.spacing16),
    this.margin,
    this.borderRadius = AppTheme.radiusLarge,
    this.borderColor,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final Color? borderColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return NeonGlassPanel(
      padding: padding,
      margin: margin,
      borderRadius: borderRadius,
      borderColor: borderColor,
      onTap: onTap,
      child: child,
    );
  }
}

class NeonGlassPanel extends StatelessWidget {
  const NeonGlassPanel({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(AppTheme.spacing16),
    this.margin,
    this.borderRadius = AppTheme.radiusLarge,
    this.borderColor,
    this.glowColor = AppTheme.neonCyan,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final Color? borderColor;
  final Color glowColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);
    final panel = ClipRRect(
      borderRadius: radius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            gradient: AppTheme.glassGradient,
            borderRadius: radius,
            border: Border.all(
              color: borderColor ?? glowColor.withValues(alpha: 0.32),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.48),
                blurRadius: 24,
                offset: const Offset(0, 14),
              ),
              BoxShadow(
                color: glowColor.withValues(alpha: 0.16),
                blurRadius: 30,
              ),
              BoxShadow(
                color: AppTheme.neonMagenta.withValues(alpha: 0.08),
                blurRadius: 40,
              ),
            ],
          ),
          child: child,
        ),
      ),
    );

    final content = onTap == null
        ? panel
        : Material(
            color: Colors.transparent,
            child: InkWell(borderRadius: radius, onTap: onTap, child: panel),
          );

    if (margin == null) return content;
    return Padding(padding: margin!, child: content);
  }
}

class NeonGradientButton extends StatelessWidget {
  const NeonGradientButton({
    required this.onPressed,
    required this.label,
    super.key,
    this.icon,
  });

  final VoidCallback? onPressed;
  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    return Semantics(
      button: true,
      enabled: enabled,
      child: Opacity(
        opacity: enabled ? 1 : 0.48,
        child: GestureDetector(
          onTap: onPressed,
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 58),
            padding: const EdgeInsets.symmetric(
              horizontal: AppTheme.spacing24,
              vertical: AppTheme.spacing16,
            ),
            decoration: BoxDecoration(
              gradient: AppTheme.ctaGradient,
              borderRadius: BorderRadius.circular(AppTheme.radiusXLarge),
              border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.neonCyan.withValues(
                    alpha: enabled ? 0.36 : 0,
                  ),
                  blurRadius: 28,
                  offset: const Offset(0, 10),
                ),
                BoxShadow(
                  color: AppTheme.neonMagenta.withValues(
                    alpha: enabled ? 0.26 : 0,
                  ),
                  blurRadius: 32,
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, color: Colors.white),
                  const SizedBox(width: AppTheme.spacing8),
                ],
                Flexible(
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class NeonOutlineChip extends StatelessWidget {
  const NeonOutlineChip({
    required this.label,
    super.key,
    this.icon,
    this.selected = false,
    this.onTap,
  });

  final String label;
  final IconData? icon;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          gradient: selected ? AppTheme.ctaGradient : null,
          color: selected ? null : AppTheme.graphiteHigh.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          border: Border.all(
            color: selected
                ? Colors.white.withValues(alpha: 0.12)
                : AppTheme.neonCyan.withValues(alpha: 0.42),
          ),
          boxShadow: selected
              ? AppTheme.neonGlow(AppTheme.neonMagenta, opacity: 0.18, blur: 18)
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 16,
                color: selected ? Colors.white : AppTheme.neonCyan,
              ),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                color: selected ? Colors.white : AppTheme.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class FlashPosterHero extends StatelessWidget {
  const FlashPosterHero({
    required this.asset,
    super.key,
    this.height = 320,
    this.title,
    this.subtitle,
    this.eyebrow,
    this.child,
    this.alignment = Alignment.center,
  });

  final String asset;
  final double height;
  final String? title;
  final String? subtitle;
  final String? eyebrow;
  final Widget? child;
  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            asset,
            fit: BoxFit.cover,
            alignment: alignment,
            semanticLabel: title ?? 'SoundCheck concert artwork',
          ),
          const DecoratedBox(
            decoration: BoxDecoration(gradient: AppTheme.posterScrimGradient),
          ),
          Positioned(
            left: AppTheme.spacing20,
            right: AppTheme.spacing20,
            bottom: AppTheme.spacing20,
            child:
                child ??
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (eyebrow != null) ...[
                      NeonOutlineChip(label: eyebrow!),
                      const SizedBox(height: AppTheme.spacing12),
                    ],
                    if (title != null)
                      Text(
                        title!,
                        style: Theme.of(context).textTheme.displaySmall
                            ?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    if (subtitle != null) ...[
                      const SizedBox(height: AppTheme.spacing8),
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppTheme.brushedSilver,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
          ),
        ],
      ),
    );
  }
}

class ShowPosterCard extends StatelessWidget {
  const ShowPosterCard({
    required this.title,
    super.key,
    this.subtitle,
    this.meta,
    this.imageUrl,
    this.asset = AppTheme.flashShowCardOneAsset,
    this.width = 164,
    this.height = 214,
    this.badge,
    this.trailing,
    this.onTap,
  });

  final String title;
  final String? subtitle;
  final String? meta;
  final String? imageUrl;
  final String asset;
  final double width;
  final double height;
  final String? badge;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(AppTheme.radiusLarge);
    return Semantics(
      button: onTap != null,
      label: [title, subtitle, meta].whereType<String>().join(', '),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: width,
          height: height,
          margin: const EdgeInsets.only(right: AppTheme.spacing12),
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: radius,
            border: Border.all(color: AppTheme.neonCyan.withValues(alpha: 0.3)),
            boxShadow: [
              BoxShadow(
                color: AppTheme.neonCyan.withValues(alpha: 0.18),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (imageUrl != null && imageUrl!.isNotEmpty)
                Image.network(
                  imageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) =>
                      Image.asset(asset, fit: BoxFit.cover),
                )
              else
                Image.asset(asset, fit: BoxFit.cover),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: AppTheme.cardOverlayGradient,
                ),
              ),
              if (badge != null)
                Positioned(
                  left: AppTheme.spacing8,
                  top: AppTheme.spacing8,
                  child: NeonOutlineChip(label: badge!, selected: true),
                ),
              Positioned(
                left: AppTheme.spacing12,
                right: AppTheme.spacing12,
                bottom: AppTheme.spacing12,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        subtitle!,
                        style: const TextStyle(
                          color: AppTheme.brushedSilver,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (meta != null) ...[
                      const SizedBox(height: 5),
                      Text(
                        meta!,
                        style: const TextStyle(
                          color: AppTheme.neonCyan,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (trailing != null) ...[
                      const SizedBox(height: AppTheme.spacing8),
                      trailing!,
                    ],
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

class CheckInPulseButton extends StatefulWidget {
  const CheckInPulseButton({
    required this.onTap,
    super.key,
    this.size = AppTheme.checkInButtonSize,
    this.semanticLabel = 'Check in to a show',
  });

  final VoidCallback onTap;
  final double size;
  final String semanticLabel;

  @override
  State<CheckInPulseButton> createState() => _CheckInPulseButtonState();
}

class _CheckInPulseButtonState extends State<CheckInPulseButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final disableAnimations =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (disableAnimations) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: widget.semanticLabel,
      button: true,
      child: Tooltip(
        message: 'Check In',
        child: GestureDetector(
          onTap: widget.onTap,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              final pulse = 0.82 + (_controller.value * 0.18);
              return Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppTheme.ctaGradient,
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.18),
                    width: 1.4,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.neonCyan.withValues(alpha: 0.28 * pulse),
                      blurRadius: 22 + (16 * pulse),
                      spreadRadius: 1.5,
                    ),
                    BoxShadow(
                      color: AppTheme.neonMagenta.withValues(
                        alpha: 0.22 * pulse,
                      ),
                      blurRadius: 28 + (18 * pulse),
                    ),
                  ],
                ),
                child: Padding(
                  padding: EdgeInsets.all(widget.size * 0.18),
                  child: Image.asset(
                    AppTheme.flashMarkAsset,
                    fit: BoxFit.contain,
                    semanticLabel: 'SoundCheck check-in mark',
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class FlashBottomNav extends StatelessWidget {
  const FlashBottomNav({
    required this.selectedIndex,
    required this.onTap,
    super.key,
    this.activityBadgeCount = 0,
  });

  final int selectedIndex;
  final void Function(int) onTap;
  final int activityBadgeCount;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: NeonGlassPanel(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        borderRadius: 28,
        borderColor: AppTheme.neonCyan.withValues(alpha: 0.28),
        child: SizedBox(
          height: 66,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _FlashNavItem(
                    icon: Icons.home_rounded,
                    label: 'Home',
                    isSelected: selectedIndex == 0,
                    onTap: () => onTap(0),
                  ),
                  _FlashNavItem(
                    icon: Icons.confirmation_num_outlined,
                    label: 'Shows',
                    isSelected: selectedIndex == 1,
                    onTap: () => onTap(1),
                  ),
                  const SizedBox(width: 76),
                  _FlashNavItem(
                    icon: Icons.equalizer_rounded,
                    label: 'Activity',
                    isSelected: selectedIndex == 4,
                    onTap: () => onTap(4),
                    badgeCount: activityBadgeCount,
                  ),
                  _FlashNavItem(
                    icon: Icons.person_outline_rounded,
                    label: 'Profile',
                    isSelected: selectedIndex == 3,
                    onTap: () => onTap(3),
                  ),
                ],
              ),
              Positioned(
                top: -27,
                child: CheckInPulseButton(size: 72, onTap: () => onTap(2)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WaveformHeader extends StatelessWidget {
  const WaveformHeader({
    required this.title,
    super.key,
    this.subtitle,
    this.asset = AppTheme.flashProfileWaveAsset,
    this.height = 210,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final String asset;
  final double height;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(asset, fit: BoxFit.cover, semanticLabel: '$title header'),
          const DecoratedBox(
            decoration: BoxDecoration(gradient: AppTheme.posterScrimGradient),
          ),
          const Positioned(
            left: 0,
            right: 0,
            bottom: 44,
            child: EqualizerDivider(height: 40),
          ),
          Positioned(
            left: AppTheme.spacing20,
            right: AppTheme.spacing20,
            bottom: AppTheme.spacing20,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.displaySmall
                            ?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: AppTheme.spacing4),
                        Text(
                          subtitle!,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: AppTheme.brushedSilver),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) ...[
                  const SizedBox(width: AppTheme.spacing12),
                  trailing!,
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class EqualizerDivider extends StatefulWidget {
  const EqualizerDivider({super.key, this.height = 34, this.animate = true});

  final double height;
  final bool animate;

  @override
  State<EqualizerDivider> createState() => _EqualizerDividerState();
}

class _EqualizerDividerState extends State<EqualizerDivider>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final disableAnimations =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (disableAnimations || !widget.animate) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) => CustomPaint(
          painter: _EqualizerPainter(progress: _controller.value),
        ),
      ),
    );
  }
}

class StatGlowTile extends StatelessWidget {
  const StatGlowTile({
    required this.value,
    required this.label,
    super.key,
    this.icon,
    this.color = AppTheme.neonCyan,
  });

  final String value;
  final String label;
  final IconData? icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return NeonGlassPanel(
      padding: const EdgeInsets.all(AppTheme.spacing16),
      borderRadius: AppTheme.radiusMedium,
      glowColor: color,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, color: color, size: 20),
            const SizedBox(height: AppTheme.spacing8),
          ],
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppTheme.brushedSilver,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class AvatarStack extends StatelessWidget {
  const AvatarStack({
    required this.labels,
    super.key,
    this.imageUrls = const [],
    this.size = 34,
    this.maxVisible = 4,
  });

  final List<String> labels;
  final List<String?> imageUrls;
  final double size;
  final int maxVisible;

  @override
  Widget build(BuildContext context) {
    final count = math.min(maxVisible, labels.length);
    final visibleOffsetCount = ((count - 1).clamp(0, maxVisible)).toDouble();
    final visibleWidth = size + (visibleOffsetCount * size * 0.62);
    return SizedBox(
      width: visibleWidth,
      height: size,
      child: Stack(
        children: [
          for (var i = 0; i < count; i++)
            Positioned(
              left: i * size * 0.62,
              child: Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.stageBlack, width: 2),
                  gradient: AppTheme.primaryGradient,
                ),
                clipBehavior: Clip.antiAlias,
                child:
                    imageUrls.length > i &&
                        imageUrls[i] != null &&
                        imageUrls[i]!.isNotEmpty
                    ? Image.network(
                        imageUrls[i]!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) =>
                            _AvatarFallback(label: labels[i]),
                      )
                    : _AvatarFallback(label: labels[i]),
              ),
            ),
        ],
      ),
    );
  }
}

class FlashEmptyState extends StatelessWidget {
  const FlashEmptyState({
    required this.title,
    required this.message,
    super.key,
    this.actionLabel,
    this.onAction,
    this.asset = AppTheme.flashEmptyStageAsset,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final String asset;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spacing24),
        child: NeonGlassPanel(
          padding: EdgeInsets.zero,
          borderRadius: AppTheme.radiusXLarge,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(AppTheme.radiusXLarge),
                ),
                child: SizedBox(
                  height: 148,
                  width: double.infinity,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.asset(
                        asset,
                        fit: BoxFit.cover,
                        semanticLabel: 'SoundCheck empty state artwork',
                      ),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: AppTheme.posterScrimGradient,
                        ),
                      ),
                      Center(
                        child: Image.asset(
                          AppTheme.flashMarkAsset,
                          width: 92,
                          semanticLabel: 'SoundCheck mark',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(AppTheme.spacing20),
                child: Column(
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w900),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppTheme.spacing8),
                    Text(
                      message,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.brushedSilver,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (onAction != null && actionLabel != null) ...[
                      const SizedBox(height: AppTheme.spacing20),
                      NeonGradientButton(
                        onPressed: onAction,
                        label: actionLabel!,
                      ),
                    ],
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

class FlashSkeleton extends StatefulWidget {
  const FlashSkeleton({
    super.key,
    this.height = 180,
    this.width = double.infinity,
    this.borderRadius = AppTheme.radiusLarge,
  });

  final double height;
  final double width;
  final double borderRadius;

  @override
  State<FlashSkeleton> createState() => _FlashSkeletonState();
}

class _FlashSkeletonState extends State<FlashSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final disableAnimations =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (disableAnimations) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final shimmer = Alignment(-1 + (_controller.value * 2), 0);
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                AppTheme.graphiteHigh.withValues(alpha: 0.62),
                AppTheme.neonCyan.withValues(alpha: 0.16),
                AppTheme.graphiteHigh.withValues(alpha: 0.62),
              ],
              stops: [
                math.max(0, _controller.value - 0.24),
                _controller.value,
                math.min(1, _controller.value + 0.24),
              ],
            ),
            border: Border.all(
              color: AppTheme.neonCyan.withValues(alpha: 0.16),
            ),
          ),
          foregroundDecoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: RadialGradient(
              center: shimmer,
              radius: 0.9,
              colors: [
                Colors.white.withValues(alpha: 0.08),
                Colors.transparent,
              ],
            ),
          ),
        );
      },
    );
  }
}

class BrandImagePlaceholder extends StatelessWidget {
  const BrandImagePlaceholder({
    super.key,
    this.height = 200,
    this.asset = AppTheme.flashEmptyStageAsset,
    this.icon = Icons.graphic_eq,
    this.borderRadius,
  });

  final double height;
  final String asset;
  final IconData icon;
  final BorderRadiusGeometry? borderRadius;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(AppTheme.radiusLarge);
    return ClipRRect(
      borderRadius: radius,
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              asset,
              fit: BoxFit.cover,
              semanticLabel: 'SoundCheck branded poster placeholder',
            ),
            const DecoratedBox(
              decoration: BoxDecoration(gradient: AppTheme.posterScrimGradient),
            ),
            Align(
              alignment: Alignment.center,
              child: Image.asset(
                AppTheme.flashMarkAsset,
                width: math.max(60.0, height * 0.34),
                semanticLabel: 'SoundCheck placeholder mark',
              ),
            ),
            Positioned(
              left: AppTheme.spacing12,
              right: AppTheme.spacing12,
              bottom: AppTheme.spacing12,
              child: EqualizerDivider(
                height: math.min(34, height * 0.18),
                animate: false,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FlashNavItem extends StatelessWidget {
  const _FlashNavItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.badgeCount = 0,
  });

  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    final color = isSelected ? AppTheme.neonCyan : AppTheme.mutedSilver;
    return Semantics(
      label: label,
      button: true,
      selected: isSelected,
      child: Tooltip(
        message: label,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Badge(
                  isLabelVisible: badgeCount > 0,
                  label: Text(badgeCount > 99 ? '99+' : '$badgeCount'),
                  backgroundColor: AppTheme.neonMagenta,
                  child: Icon(icon, size: 23, color: color),
                ),
                const SizedBox(height: 3),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 10.5,
                    color: color,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AvatarFallback extends StatelessWidget {
  const _AvatarFallback({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        label.isNotEmpty ? label[0].toUpperCase() : '?',
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _EqualizerPainter extends CustomPainter {
  _EqualizerPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final barPaint = Paint()
      ..shader = AppTheme.waveformGradient.createShader(
        Rect.fromLTWH(0, 0, size.width, size.height),
      )
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 2.2;
    final wavePaint = Paint()
      ..shader = AppTheme.waveformGradient.createShader(
        Rect.fromLTWH(0, 0, size.width, size.height),
      )
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;

    final bars = math.max(24, (size.width / 8).floor());
    for (var i = 0; i < bars; i++) {
      final x = (i / (bars - 1)) * size.width;
      final phase = (progress * math.pi * 2) + (i * 0.58);
      final normalized = (math.sin(phase) + 1) / 2;
      final h = (size.height * 0.18) + (normalized * size.height * 0.72);
      final y1 = (size.height - h) / 2;
      final y2 = y1 + h;
      canvas.drawLine(Offset(x, y1), Offset(x, y2), barPaint);
    }

    final path = Path();
    for (var x = 0.0; x <= size.width; x += 4) {
      final y =
          (size.height * 0.5) +
          math.sin((x / size.width * math.pi * 4) + progress * math.pi * 2) *
              size.height *
              0.22;
      if (x == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, wavePaint);
  }

  @override
  bool shouldRepaint(covariant _EqualizerPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class _FlashEdgeScrim extends StatelessWidget {
  const _FlashEdgeScrim();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.topCenter,
          radius: 1.18,
          colors: [
            Colors.transparent,
            AppTheme.stageBlack.withValues(alpha: 0.42),
            AppTheme.voidBlack.withValues(alpha: 0.96),
          ],
          stops: const [0.0, 0.54, 1.0],
        ),
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.voidBlack.withValues(alpha: 0.58),
              Colors.transparent,
              AppTheme.voidBlack.withValues(alpha: 0.92),
            ],
            stops: const [0, 0.34, 1],
          ),
        ),
      ),
    );
  }
}

class _StageLightWash extends StatelessWidget {
  const _StageLightWash();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            Color(0x4AFF22E8),
            Color(0x2A1D63FF),
            Color(0x2600E5FF),
            Color(0x00000000),
          ],
          stops: [0, 0.36, 0.72, 1],
        ),
      ),
    );
  }
}
