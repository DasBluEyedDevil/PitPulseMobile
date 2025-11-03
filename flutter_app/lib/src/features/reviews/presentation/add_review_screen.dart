import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../domain/review.dart';

class AddReviewScreen extends ConsumerStatefulWidget {
  final String? venueId;
  final String? bandId;

  const AddReviewScreen({
    super.key,
    this.venueId,
    this.bandId,
  });

  @override
  ConsumerState<AddReviewScreen> createState() => _AddReviewScreenState();
}

class _AddReviewScreenState extends ConsumerState<AddReviewScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  double _rating = 3.0;
  bool _isLoading = false;

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (widget.venueId == null && widget.bandId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a venue or band'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final repository = ref.read(reviewRepositoryProvider);
      await repository.createReview(
        CreateReviewRequest(
          venueId: widget.venueId,
          bandId: widget.bandId,
          rating: _rating,
          title: _titleController.text.trim().isEmpty
              ? null
              : _titleController.text.trim(),
          content: _contentController.text.trim().isEmpty
              ? null
              : _contentController.text.trim(),
        ),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Review submitted successfully!'),
            backgroundColor: AppTheme.success,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit review: ${e.toString()}'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Write a Review'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTheme.spacing16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Rating
              Text(
                'Rating',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppTheme.spacing8),
              Center(
                child: Column(
                  children: [
                    Text(
                      _rating.toStringAsFixed(1),
                      style: Theme.of(context).textTheme.displayMedium?.copyWith(
                            color: AppTheme.primary,
                          ),
                    ),
                    Slider(
                      value: _rating,
                      min: 1.0,
                      max: 5.0,
                      divisions: 8,
                      label: _rating.toStringAsFixed(1),
                      onChanged: (value) {
                        setState(() => _rating = value);
                      },
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        final starValue = index + 1;
                        return Icon(
                          _rating >= starValue
                              ? Icons.star
                              : _rating >= starValue - 0.5
                                  ? Icons.star_half
                                  : Icons.star_border,
                          size: 32,
                          color: AppTheme.warning,
                        );
                      }),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppTheme.spacing24),

              // Title
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Title (Optional)',
                  hintText: 'Give your review a title',
                ),
                maxLength: 100,
              ),
              const SizedBox(height: AppTheme.spacing16),

              // Content
              TextFormField(
                controller: _contentController,
                decoration: const InputDecoration(
                  labelText: 'Review (Optional)',
                  hintText: 'Share your experience',
                  alignLabelWithHint: true,
                ),
                maxLines: 6,
                maxLength: 500,
              ),
              const SizedBox(height: AppTheme.spacing24),

              // Submit Button
              ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text('Submit Review'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
