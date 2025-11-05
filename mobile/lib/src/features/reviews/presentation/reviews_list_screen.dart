import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../domain/review.dart';
import 'providers/review_providers.dart';
import 'widgets/review_card.dart';

/// ReviewsListScreen displays all reviews for a venue or band with pagination
class ReviewsListScreen extends ConsumerStatefulWidget {
  final String? venueId;
  final String? bandId;
  final String title;

  const ReviewsListScreen({
    super.key,
    this.venueId,
    this.bandId,
    required this.title,
  });

  @override
  ConsumerState<ReviewsListScreen> createState() => _ReviewsListScreenState();
}

class _ReviewsListScreenState extends ConsumerState<ReviewsListScreen> {
  final ScrollController _scrollController = ScrollController();
  final List<Review> _allReviews = [];
  int _currentPage = 1;
  bool _isLoadingMore = false;
  bool _hasMoreData = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadInitialReviews();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoadingMore && _hasMoreData) {
        _loadMoreReviews();
      }
    }
  }

  Future<void> _loadInitialReviews() async {
    _currentPage = 1;
    _allReviews.clear();
    setState(() {});
  }

  Future<void> _loadMoreReviews() async {
    if (_isLoadingMore || !_hasMoreData) return;

    setState(() {
      _isLoadingMore = true;
    });

    try {
      final List<Review> newReviews;

      if (widget.venueId != null) {
        final params = VenueReviewsParams(
          venueId: widget.venueId!,
          page: _currentPage + 1,
          limit: 20,
        );
        newReviews = await ref.read(allVenueReviewsProvider(params).future);
      } else if (widget.bandId != null) {
        final params = BandReviewsParams(
          bandId: widget.bandId!,
          page: _currentPage + 1,
          limit: 20,
        );
        newReviews = await ref.read(allBandReviewsProvider(params).future);
      } else {
        return;
      }

      if (mounted) {
        setState(() {
          _currentPage++;
          _allReviews.addAll(newReviews);
          _isLoadingMore = false;
          _hasMoreData = newReviews.isNotEmpty;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
        });
      }
    }
  }

  Future<void> _handleRefresh() async {
    // Invalidate the provider to trigger a fresh fetch
    if (widget.venueId != null) {
      ref.invalidate(allVenueReviewsProvider);
    } else if (widget.bandId != null) {
      ref.invalidate(allBandReviewsProvider);
    }

    // Reset pagination state
    setState(() {
      _currentPage = 1;
      _allReviews.clear();
      _hasMoreData = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Get the first page of reviews
    final AsyncValue<List<Review>> reviewsAsync;

    if (widget.venueId != null) {
      final params = VenueReviewsParams(
        venueId: widget.venueId!,
        page: 1,
        limit: 20,
      );
      reviewsAsync = ref.watch(allVenueReviewsProvider(params));
    } else if (widget.bandId != null) {
      final params = BandReviewsParams(
        bandId: widget.bandId!,
        page: 1,
        limit: 20,
      );
      reviewsAsync = ref.watch(allBandReviewsProvider(params));
    } else {
      return Scaffold(
        appBar: AppBar(
          title: Text(widget.title),
        ),
        body: const Center(
          child: Text('Invalid parameters'),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: reviewsAsync.when(
        data: (initialReviews) {
          // Combine initial reviews with loaded reviews
          final allReviews = _currentPage == 1
              ? initialReviews
              : [...initialReviews, ..._allReviews.skip(initialReviews.length)];

          if (allReviews.isEmpty) {
            return _buildEmptyState();
          }

          return RefreshIndicator(
            onRefresh: _handleRefresh,
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(AppTheme.spacing16),
              itemCount: allReviews.length + (_isLoadingMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == allReviews.length) {
                  return const Padding(
                    padding: EdgeInsets.all(AppTheme.spacing16),
                    child: Center(
                      child: CircularProgressIndicator(),
                    ),
                  );
                }

                // Store the reviews for pagination
                if (_currentPage == 1 && index == initialReviews.length - 1) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (_allReviews.isEmpty) {
                      setState(() {
                        _allReviews.addAll(initialReviews);
                      });
                    }
                  });
                }

                return ReviewCard(review: allReviews[index]);
              },
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, _) => _buildErrorState(error),
      ),
    );
  }

  Widget _buildEmptyState() {
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.7,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.rate_review_outlined,
                    size: 80,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: AppTheme.spacing24),
                  Text(
                    'No reviews yet',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: AppTheme.textSecondary,
                        ),
                  ),
                  const SizedBox(height: AppTheme.spacing12),
                  Text(
                    'Be the first to write a review!',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppTheme.textSecondary,
                        ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(Object error) {
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.7,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.spacing32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 64,
                      color: AppTheme.error,
                    ),
                    const SizedBox(height: AppTheme.spacing24),
                    const Text(
                      'Could not load reviews',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppTheme.spacing12),
                    Text(
                      'Please check your connection and try again.',
                      style: TextStyle(
                        color: Colors.grey[600],
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppTheme.spacing24),
                    ElevatedButton.icon(
                      onPressed: _handleRefresh,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
