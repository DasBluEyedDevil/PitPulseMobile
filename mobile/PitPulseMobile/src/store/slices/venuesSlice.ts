import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { VenuesState, Venue, VenueSearchParams, PaginatedResponse } from '../../types';
import apiService from '../../services/api';

const initialState: VenuesState = {
  venues: [],
  popularVenues: [],
  currentVenue: null,
  isLoading: false,
  error: null,
  searchResults: null,
};

// Async thunks
export const fetchVenues = createAsyncThunk(
  'venues/fetchVenues',
  async (params?: VenueSearchParams, { rejectWithValue }) => {
    try {
      const response = await apiService.getVenues(params);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch venues');
    }
  }
);

export const fetchVenueById = createAsyncThunk(
  'venues/fetchVenueById',
  async (venueId: string, { rejectWithValue }) => {
    try {
      const venue = await apiService.getVenueById(venueId);
      return venue;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch venue');
    }
  }
);

export const fetchPopularVenues = createAsyncThunk(
  'venues/fetchPopularVenues',
  async (limit?: number, { rejectWithValue }) => {
    try {
      const venues = await apiService.getPopularVenues(limit);
      return venues;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch popular venues');
    }
  }
);

export const fetchVenuesNear = createAsyncThunk(
  'venues/fetchVenuesNear',
  async (
    { lat, lng, radius, limit }: { lat: number; lng: number; radius?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const venues = await apiService.getVenuesNear(lat, lng, radius, limit);
      return venues;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch nearby venues');
    }
  }
);

export const searchVenues = createAsyncThunk(
  'venues/searchVenues',
  async (params: VenueSearchParams, { rejectWithValue }) => {
    try {
      const response = await apiService.getVenues(params);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to search venues');
    }
  }
);

const venuesSlice = createSlice({
  name: 'venues',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentVenue: (state) => {
      state.currentVenue = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch venues
    builder
      .addCase(fetchVenues.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVenues.fulfilled, (state, action: PayloadAction<PaginatedResponse<Venue[]>>) => {
        state.isLoading = false;
        state.venues = action.payload.venues || action.payload.items;
        state.error = null;
      })
      .addCase(fetchVenues.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch venue by ID
    builder
      .addCase(fetchVenueById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVenueById.fulfilled, (state, action: PayloadAction<Venue>) => {
        state.isLoading = false;
        state.currentVenue = action.payload;
        state.error = null;
      })
      .addCase(fetchVenueById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch popular venues
    builder
      .addCase(fetchPopularVenues.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPopularVenues.fulfilled, (state, action: PayloadAction<Venue[]>) => {
        state.isLoading = false;
        state.popularVenues = action.payload;
        state.error = null;
      })
      .addCase(fetchPopularVenues.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch venues near
    builder
      .addCase(fetchVenuesNear.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVenuesNear.fulfilled, (state, action: PayloadAction<Venue[]>) => {
        state.isLoading = false;
        state.venues = action.payload;
        state.error = null;
      })
      .addCase(fetchVenuesNear.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search venues
    builder
      .addCase(searchVenues.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchVenues.fulfilled, (state, action: PayloadAction<PaginatedResponse<Venue[]>>) => {
        state.isLoading = false;
        state.searchResults = {
          venues: action.payload.venues || action.payload.items,
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
        state.error = null;
      })
      .addCase(searchVenues.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentVenue, clearSearchResults } = venuesSlice.actions;
export default venuesSlice.reducer;