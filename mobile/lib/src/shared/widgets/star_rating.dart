import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class StarRating extends StatelessWidget {
  final double rating;
  final double size;
  final Color color;

  const StarRating({
    required this.rating, super.key,
    this.size = 16,
    this.color = AppTheme.warning,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '${rating.toStringAsFixed(1)} out of 5 stars',
      readOnly: true,
      child: ExcludeSemantics(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(5, (index) {
            final starValue = index + 1;
            IconData icon;

            if (rating >= starValue) {
              icon = Icons.star;
            } else if (rating >= starValue - 0.5) {
              icon = Icons.star_half;
            } else {
              icon = Icons.star_border;
            }

            return Icon(
              icon,
              size: size,
              color: color,
            );
          }),
        ),
      ),
    );
  }
}
