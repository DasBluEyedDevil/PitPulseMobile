import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '../constants';
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Venue,
  Band,
  Review,
  Badge,
  UserBadge,
  BadgeProgress,
  CreateReviewRequest,
  VenueSearchParams,
  BandSearchParams,
  ReviewSearchParams,
  PaginatedResponse,
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear storage and redirect to login
          await this.clearAuthData();
          // You can emit an event here to redirect to login screen
        }
        return Promise.reject(error);
      }
    );
  }

  private async clearAuthData() {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_DATA]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  private handleApiError(error: any): string {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  // Auth API
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<ApiResponse<AuthResponse>>('/users/login', credentials);
      const authData = response.data.data!;
      
      // Store auth data
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(authData.user));
      
      return authData;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      // First register the user
      const registerResponse = await this.api.post<ApiResponse<User>>('/users/register', userData);
      
      // Then login to get the token
      const loginResponse = await this.login({
        email: userData.email,
        password: userData.password,
      });
      
      return loginResponse;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get<ApiResponse<User>>('/users/me');
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await this.api.put<ApiResponse<User>>('/users/me', userData);
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async logout(): Promise<void> {
    await this.clearAuthData();
  }

  // Venues API
  async getVenues(params?: VenueSearchParams): Promise<PaginatedResponse<Venue[]>> {
    try {
      const response = await this.api.get<ApiResponse<PaginatedResponse<Venue[]>>>('/venues', { params });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getVenueById(venueId: string): Promise<Venue> {
    try {
      const response = await this.api.get<ApiResponse<Venue>>(`/venues/${venueId}`);
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getPopularVenues(limit?: number): Promise<Venue[]> {
    try {
      const response = await this.api.get<ApiResponse<Venue[]>>('/venues/popular', {
        params: { limit },
      });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getVenuesNear(lat: number, lng: number, radius?: number, limit?: number): Promise<Venue[]> {
    try {
      const response = await this.api.get<ApiResponse<Venue[]>>('/venues/near', {
        params: { lat, lng, radius, limit },
      });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  // Bands API
  async getBands(params?: BandSearchParams): Promise<PaginatedResponse<Band[]>> {
    try {
      const response = await this.api.get<ApiResponse<PaginatedResponse<Band[]>>>('/bands', { params });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getBandById(bandId: string): Promise<Band> {
    try {
      const response = await this.api.get<ApiResponse<Band>>(`/bands/${bandId}`);
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getPopularBands(limit?: number): Promise<Band[]> {
    try {
      const response = await this.api.get<ApiResponse<Band[]>>('/bands/popular', {
        params: { limit },
      });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getTrendingBands(limit?: number): Promise<Band[]> {
    try {
      const response = await this.api.get<ApiResponse<Band[]>>('/bands/trending', {
        params: { limit },
      });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getGenres(): Promise<string[]> {
    try {
      const response = await this.api.get<ApiResponse<string[]>>('/bands/genres');
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getBandsByGenre(genre: string, limit?: number): Promise<Band[]> {
    try {
      const response = await this.api.get<ApiResponse<Band[]>>(`/bands/genre/${genre}`, {
        params: { limit },
      });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  // Reviews API
  async getReviews(params?: ReviewSearchParams): Promise<PaginatedResponse<Review[]>> {
    try {
      const response = await this.api.get<ApiResponse<PaginatedResponse<Review[]>>>('/reviews', { params });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getReviewById(reviewId: string): Promise<Review> {
    try {
      const response = await this.api.get<ApiResponse<Review>>(`/reviews/${reviewId}`);
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async createReview(reviewData: CreateReviewRequest): Promise<Review> {
    try {
      const response = await this.api.post<ApiResponse<Review>>('/reviews', reviewData);
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async updateReview(reviewId: string, reviewData: Partial<CreateReviewRequest>): Promise<Review> {
    try {
      const response = await this.api.put<ApiResponse<Review>>(`/reviews/${reviewId}`, reviewData);
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    try {
      await this.api.delete(`/reviews/${reviewId}`);
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async markReviewHelpful(reviewId: string, isHelpful: boolean): Promise<void> {
    try {
      await this.api.post(`/reviews/${reviewId}/helpful`, { isHelpful });
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getMyReview(venueId?: string, bandId?: string): Promise<Review | null> {
    try {
      const params: any = {};
      if (venueId) params.venueId = venueId;
      if (bandId) params.bandId = bandId;
      
      const response = await this.api.get<ApiResponse<Review | null>>('/reviews/my-review', { params });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getReviewsByVenue(venueId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Review[]>> {
    try {
      const response = await this.api.get<ApiResponse<PaginatedResponse<Review[]>>>(`/reviews/venue/${venueId}`, { params });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getReviewsByBand(bandId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Review[]>> {
    try {
      const response = await this.api.get<ApiResponse<PaginatedResponse<Review[]>>>(`/reviews/band/${bandId}`, { params });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getReviewsByUser(userId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Review[]>> {
    try {
      const response = await this.api.get<ApiResponse<PaginatedResponse<Review[]>>>(`/reviews/user/${userId}`, { params });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  // Badges API
  async getBadges(): Promise<Badge[]> {
    try {
      const response = await this.api.get<ApiResponse<Badge[]>>('/badges');
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getUserBadges(userId?: string): Promise<UserBadge[]> {
    try {
      const endpoint = userId ? `/badges/user/${userId}` : '/badges/my-badges';
      const response = await this.api.get<ApiResponse<UserBadge[]>>(endpoint);
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getBadgeProgress(): Promise<BadgeProgress[]> {
    try {
      const response = await this.api.get<ApiResponse<BadgeProgress[]>>('/badges/my-progress');
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async checkAndAwardBadges(): Promise<{ newBadges: Badge[]; count: number }> {
    try {
      const response = await this.api.post<ApiResponse<{ newBadges: Badge[]; count: number }>>('/badges/check-awards');
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  async getBadgeLeaderboard(limit?: number): Promise<any[]> {
    try {
      const response = await this.api.get<ApiResponse<any[]>>('/badges/leaderboard', {
        params: { limit },
      });
      return response.data.data!;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(this.handleApiError(error));
    }
  }
}

export const apiService = new ApiService();
export default apiService;