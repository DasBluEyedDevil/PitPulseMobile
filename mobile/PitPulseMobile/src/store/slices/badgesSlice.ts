import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { BadgesState, Badge, UserBadge, BadgeProgress } from '../../types';
import apiService from '../../services/api';

const initialState: BadgesState = {
  badges: [],
  userBadges: [],
  badgeProgress: [],
  leaderboard: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchBadges = createAsyncThunk(
  'badges/fetchBadges',
  async (_, { rejectWithValue }) => {
    try {
      const badges = await apiService.getBadges();
      return badges;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch badges');
    }
  }
);

export const fetchUserBadges = createAsyncThunk(
  'badges/fetchUserBadges',
  async (userId?: string, { rejectWithValue }) => {
    try {
      const userBadges = await apiService.getUserBadges(userId);
      return userBadges;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch user badges');
    }
  }
);

export const fetchBadgeProgress = createAsyncThunk(
  'badges/fetchBadgeProgress',
  async (_, { rejectWithValue }) => {
    try {
      const progress = await apiService.getBadgeProgress();
      return progress;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch badge progress');
    }
  }
);

export const checkAndAwardBadges = createAsyncThunk(
  'badges/checkAndAwardBadges',
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiService.checkAndAwardBadges();
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to check badge awards');
    }
  }
);

export const fetchBadgeLeaderboard = createAsyncThunk(
  'badges/fetchBadgeLeaderboard',
  async (limit?: number, { rejectWithValue }) => {
    try {
      const leaderboard = await apiService.getBadgeLeaderboard(limit);
      return leaderboard;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch badge leaderboard');
    }
  }
);

const badgesSlice = createSlice({
  name: 'badges',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addUserBadge: (state, action: PayloadAction<UserBadge>) => {
      state.userBadges.push(action.payload);
    },
    updateBadgeProgress: (state, action: PayloadAction<BadgeProgress[]>) => {
      state.badgeProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch badges
    builder
      .addCase(fetchBadges.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBadges.fulfilled, (state, action: PayloadAction<Badge[]>) => {
        state.isLoading = false;
        state.badges = action.payload;
        state.error = null;
      })
      .addCase(fetchBadges.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch user badges
    builder
      .addCase(fetchUserBadges.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserBadges.fulfilled, (state, action: PayloadAction<UserBadge[]>) => {
        state.isLoading = false;
        state.userBadges = action.payload;
        state.error = null;
      })
      .addCase(fetchUserBadges.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch badge progress
    builder
      .addCase(fetchBadgeProgress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBadgeProgress.fulfilled, (state, action: PayloadAction<BadgeProgress[]>) => {
        state.isLoading = false;
        state.badgeProgress = action.payload;
        state.error = null;
      })
      .addCase(fetchBadgeProgress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Check and award badges
    builder
      .addCase(checkAndAwardBadges.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAndAwardBadges.fulfilled, (state, action: PayloadAction<{ newBadges: Badge[]; count: number }>) => {
        state.isLoading = false;
        // Add new badges to user badges (they would have UserBadge wrapper from API)
        // We'll refetch user badges to get the complete data
        state.error = null;
      })
      .addCase(checkAndAwardBadges.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch badge leaderboard
    builder
      .addCase(fetchBadgeLeaderboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBadgeLeaderboard.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.isLoading = false;
        state.leaderboard = action.payload;
        state.error = null;
      })
      .addCase(fetchBadgeLeaderboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, addUserBadge, updateBadgeProgress } = badgesSlice.actions;
export default badgesSlice.reducer;