import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ReviewsState, Review, CreateReviewRequest, ReviewSearchParams, PaginatedResponse } from '../../types';
import apiService from '../../services/api';

const initialState: ReviewsState = {
  reviews: [],
  currentReview: null,
  userReviews: [],
  isLoading: false,
  error: null,
  searchResults: null,
};

// Async thunks
export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async (params?: ReviewSearchParams, { rejectWithValue }) => {
    try {
      const response = await apiService.getReviews(params);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch reviews');
    }
  }
);

export const fetchReviewById = createAsyncThunk(
  'reviews/fetchReviewById',
  async (reviewId: string, { rejectWithValue }) => {
    try {
      const review = await apiService.getReviewById(reviewId);
      return review;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch review');
    }
  }
);

export const createReview = createAsyncThunk(
  'reviews/createReview',
  async (reviewData: CreateReviewRequest, { rejectWithValue }) => {
    try {
      const review = await apiService.createReview(reviewData);
      return review;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create review');
    }
  }
);

export const updateReview = createAsyncThunk(
  'reviews/updateReview',
  async (
    { reviewId, reviewData }: { reviewId: string; reviewData: Partial<CreateReviewRequest> },
    { rejectWithValue }
  ) => {
    try {
      const review = await apiService.updateReview(reviewId, reviewData);
      return review;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update review');
    }
  }
);

export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (reviewId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteReview(reviewId);
      return reviewId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete review');
    }
  }
);

export const markReviewHelpful = createAsyncThunk(
  'reviews/markReviewHelpful',
  async (
    { reviewId, isHelpful }: { reviewId: string; isHelpful: boolean },
    { rejectWithValue }
  ) => {
    try {
      await apiService.markReviewHelpful(reviewId, isHelpful);
      return { reviewId, isHelpful };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to mark review');
    }
  }
);

export const fetchMyReview = createAsyncThunk(
  'reviews/fetchMyReview',
  async (
    { venueId, bandId }: { venueId?: string; bandId?: string },
    { rejectWithValue }
  ) => {
    try {
      const review = await apiService.getMyReview(venueId, bandId);
      return review;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch review');
    }
  }
);

export const fetchReviewsByVenue = createAsyncThunk(
  'reviews/fetchReviewsByVenue',
  async (
    { venueId, params }: { venueId: string; params?: { page?: number; limit?: number } },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.getReviewsByVenue(venueId, params);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch venue reviews');
    }
  }
);

export const fetchReviewsByBand = createAsyncThunk(
  'reviews/fetchReviewsByBand',
  async (
    { bandId, params }: { bandId: string; params?: { page?: number; limit?: number } },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.getReviewsByBand(bandId, params);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch band reviews');
    }
  }
);

export const fetchReviewsByUser = createAsyncThunk(
  'reviews/fetchReviewsByUser',
  async (
    { userId, params }: { userId: string; params?: { page?: number; limit?: number } },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.getReviewsByUser(userId, params);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch user reviews');
    }
  }
);

export const searchReviews = createAsyncThunk(
  'reviews/searchReviews',
  async (params: ReviewSearchParams, { rejectWithValue }) => {
    try {
      const response = await apiService.getReviews(params);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to search reviews');
    }
  }
);

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentReview: (state) => {
      state.currentReview = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = null;
    },
    addReview: (state, action: PayloadAction<Review>) => {
      state.reviews.unshift(action.payload);
    },
    updateReviewInList: (state, action: PayloadAction<Review>) => {
      const index = state.reviews.findIndex(review => review.id === action.payload.id);
      if (index !== -1) {
        state.reviews[index] = action.payload;
      }
    },
    removeReviewFromList: (state, action: PayloadAction<string>) => {
      state.reviews = state.reviews.filter(review => review.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch reviews
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action: PayloadAction<PaginatedResponse<Review[]>>) => {
        state.isLoading = false;
        state.reviews = action.payload.reviews || action.payload.items;
        state.error = null;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch review by ID
    builder
      .addCase(fetchReviewById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReviewById.fulfilled, (state, action: PayloadAction<Review>) => {
        state.isLoading = false;
        state.currentReview = action.payload;
        state.error = null;
      })
      .addCase(fetchReviewById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create review
    builder
      .addCase(createReview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createReview.fulfilled, (state, action: PayloadAction<Review>) => {
        state.isLoading = false;
        state.reviews.unshift(action.payload);
        state.error = null;
      })
      .addCase(createReview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update review
    builder
      .addCase(updateReview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateReview.fulfilled, (state, action: PayloadAction<Review>) => {
        state.isLoading = false;
        const index = state.reviews.findIndex(review => review.id === action.payload.id);
        if (index !== -1) {
          state.reviews[index] = action.payload;
        }
        if (state.currentReview?.id === action.payload.id) {
          state.currentReview = action.payload;
        }
        state.error = null;
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete review
    builder
      .addCase(deleteReview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteReview.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.reviews = state.reviews.filter(review => review.id !== action.payload);
        if (state.currentReview?.id === action.payload) {
          state.currentReview = null;
        }
        state.error = null;
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch my review
    builder
      .addCase(fetchMyReview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyReview.fulfilled, (state, action: PayloadAction<Review | null>) => {
        state.isLoading = false;
        state.currentReview = action.payload;
        state.error = null;
      })
      .addCase(fetchMyReview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch reviews by venue
    builder
      .addCase(fetchReviewsByVenue.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReviewsByVenue.fulfilled, (state, action: PayloadAction<PaginatedResponse<Review[]>>) => {
        state.isLoading = false;
        state.reviews = action.payload.reviews || action.payload.items;
        state.error = null;
      })
      .addCase(fetchReviewsByVenue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch reviews by band
    builder
      .addCase(fetchReviewsByBand.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReviewsByBand.fulfilled, (state, action: PayloadAction<PaginatedResponse<Review[]>>) => {
        state.isLoading = false;
        state.reviews = action.payload.reviews || action.payload.items;
        state.error = null;
      })
      .addCase(fetchReviewsByBand.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch reviews by user
    builder
      .addCase(fetchReviewsByUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReviewsByUser.fulfilled, (state, action: PayloadAction<PaginatedResponse<Review[]>>) => {
        state.isLoading = false;
        state.userReviews = action.payload.reviews || action.payload.items;
        state.error = null;
      })
      .addCase(fetchReviewsByUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search reviews
    builder
      .addCase(searchReviews.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchReviews.fulfilled, (state, action: PayloadAction<PaginatedResponse<Review[]>>) => {
        state.isLoading = false;
        state.searchResults = {
          reviews: action.payload.reviews || action.payload.items,
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
        state.error = null;
      })
      .addCase(searchReviews.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearCurrentReview,
  clearSearchResults,
  addReview,
  updateReviewInList,
  removeReviewFromList,
} = reviewsSlice.actions;

export default reviewsSlice.reducer;