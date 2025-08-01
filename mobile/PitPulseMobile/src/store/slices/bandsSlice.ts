import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { BandsState, Band, BandSearchParams, PaginatedResponse } from '../../types';
import apiService from '../../services/api';

const initialState: BandsState = {
  bands: [],
  popularBands: [],
  trendingBands: [],
  currentBand: null,
  genres: [],
  isLoading: false,
  error: null,
  searchResults: null,
};

// Async thunks
export const fetchBands = createAsyncThunk(
  'bands/fetchBands',
  async (params?: BandSearchParams, { rejectWithValue }) => {
    try {
      const response = await apiService.getBands(params);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch bands');
    }
  }
);

export const fetchBandById = createAsyncThunk(
  'bands/fetchBandById',
  async (bandId: string, { rejectWithValue }) => {
    try {
      const band = await apiService.getBandById(bandId);
      return band;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch band');
    }
  }
);

export const fetchPopularBands = createAsyncThunk(
  'bands/fetchPopularBands',
  async (limit?: number, { rejectWithValue }) => {
    try {
      const bands = await apiService.getPopularBands(limit);
      return bands;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch popular bands');
    }
  }
);

export const fetchTrendingBands = createAsyncThunk(
  'bands/fetchTrendingBands',
  async (limit?: number, { rejectWithValue }) => {
    try {
      const bands = await apiService.getTrendingBands(limit);
      return bands;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch trending bands');
    }
  }
);

export const fetchGenres = createAsyncThunk(
  'bands/fetchGenres',
  async (_, { rejectWithValue }) => {
    try {
      const genres = await apiService.getGenres();
      return genres;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch genres');
    }
  }
);

export const fetchBandsByGenre = createAsyncThunk(
  'bands/fetchBandsByGenre',
  async ({ genre, limit }: { genre: string; limit?: number }, { rejectWithValue }) => {
    try {
      const bands = await apiService.getBandsByGenre(genre, limit);
      return bands;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch bands by genre');
    }
  }
);

export const searchBands = createAsyncThunk(
  'bands/searchBands',
  async (params: BandSearchParams, { rejectWithValue }) => {
    try {
      const response = await apiService.getBands(params);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to search bands');
    }
  }
);

const bandsSlice = createSlice({
  name: 'bands',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBand: (state) => {
      state.currentBand = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch bands
    builder
      .addCase(fetchBands.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBands.fulfilled, (state, action: PayloadAction<PaginatedResponse<Band[]>>) => {
        state.isLoading = false;
        state.bands = action.payload.bands || action.payload.items;
        state.error = null;
      })
      .addCase(fetchBands.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch band by ID
    builder
      .addCase(fetchBandById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBandById.fulfilled, (state, action: PayloadAction<Band>) => {
        state.isLoading = false;
        state.currentBand = action.payload;
        state.error = null;
      })
      .addCase(fetchBandById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch popular bands
    builder
      .addCase(fetchPopularBands.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPopularBands.fulfilled, (state, action: PayloadAction<Band[]>) => {
        state.isLoading = false;
        state.popularBands = action.payload;
        state.error = null;
      })
      .addCase(fetchPopularBands.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch trending bands
    builder
      .addCase(fetchTrendingBands.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTrendingBands.fulfilled, (state, action: PayloadAction<Band[]>) => {
        state.isLoading = false;
        state.trendingBands = action.payload;
        state.error = null;
      })
      .addCase(fetchTrendingBands.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch genres
    builder
      .addCase(fetchGenres.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGenres.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.isLoading = false;
        state.genres = action.payload;
        state.error = null;
      })
      .addCase(fetchGenres.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch bands by genre
    builder
      .addCase(fetchBandsByGenre.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBandsByGenre.fulfilled, (state, action: PayloadAction<Band[]>) => {
        state.isLoading = false;
        state.bands = action.payload;
        state.error = null;
      })
      .addCase(fetchBandsByGenre.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search bands
    builder
      .addCase(searchBands.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchBands.fulfilled, (state, action: PayloadAction<PaginatedResponse<Band[]>>) => {
        state.isLoading = false;
        state.searchResults = {
          bands: action.payload.bands || action.payload.items,
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
        state.error = null;
      })
      .addCase(searchBands.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentBand, clearSearchResults } = bandsSlice.actions;
export default bandsSlice.reducer;