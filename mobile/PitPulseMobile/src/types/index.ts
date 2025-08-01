// TypeScript type definitions for PitPulse mobile app

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  profileImageUrl?: string;
  location?: string;
  dateOfBirth?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats?: UserStats;
}

export interface UserStats {
  reviewCount: number;
  badgeCount: number;
  followerCount: number;
  followingCount: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Venue {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  websiteUrl?: string;
  phone?: string;
  email?: string;
  capacity?: number;
  venueType?: VenueType;
  imageUrl?: string;
  averageRating: number;
  totalReviews: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VenueType = 'concert_hall' | 'club' | 'arena' | 'outdoor' | 'bar' | 'theater' | 'stadium' | 'other';

export interface Band {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  formedYear?: number;
  websiteUrl?: string;
  spotifyUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  imageUrl?: string;
  hometown?: string;
  averageRating: number;
  totalReviews: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  venueId?: string;
  bandId?: string;
  rating: number;
  title?: string;
  content?: string;
  eventDate?: string;
  imageUrls?: string[];
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  venue?: Venue;
  band?: Band;
}

export interface CreateReviewRequest {
  venueId?: string;
  bandId?: string;
  rating: number;
  title?: string;
  content?: string;
  eventDate?: string;
  imageUrls?: string[];
}

export interface Badge {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  badgeType: BadgeType;
  requirementValue?: number;
  color?: string;
  createdAt: string;
}

export type BadgeType = 'review_count' | 'venue_explorer' | 'music_lover' | 'event_attendance' | 'helpful_count';

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  badge?: Badge;
}

export interface BadgeProgress {
  badge: Badge;
  progress: number;
  isEarned: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T;
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchParams {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface VenueSearchParams extends SearchParams {
  city?: string;
  venueType?: VenueType;
  rating?: number;
}

export interface BandSearchParams extends SearchParams {
  genre?: string;
  rating?: number;
}

export interface ReviewSearchParams extends SearchParams {
  userId?: string;
  venueId?: string;
  bandId?: string;
  minRating?: number;
  maxRating?: number;
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  VenueDetail: { venueId: string };
  BandDetail: { bandId: string };
  ReviewDetail: { reviewId: string };
  CreateReview: { venueId?: string; bandId?: string };
  Profile: { userId?: string };
  EditProfile: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Venues: undefined;
  Bands: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

// Redux State types
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface VenuesState {
  venues: Venue[];
  popularVenues: Venue[];
  currentVenue: Venue | null;
  isLoading: boolean;
  error: string | null;
  searchResults: {
    venues: Venue[];
    total: number;
    page: number;
    totalPages: number;
  } | null;
}

export interface BandsState {
  bands: Band[];
  popularBands: Band[];
  trendingBands: Band[];
  currentBand: Band | null;
  genres: string[];
  isLoading: boolean;
  error: string | null;
  searchResults: {
    bands: Band[];
    total: number;
    page: number;
    totalPages: number;
  } | null;
}

export interface ReviewsState {
  reviews: Review[];
  currentReview: Review | null;
  userReviews: Review[];
  isLoading: boolean;
  error: string | null;
  searchResults: {
    reviews: Review[];
    total: number;
    page: number;
    totalPages: number;
  } | null;
}

export interface BadgesState {
  badges: Badge[];
  userBadges: UserBadge[];
  badgeProgress: BadgeProgress[];
  leaderboard: any[];
  isLoading: boolean;
  error: string | null;
}

export interface RootState {
  auth: AuthState;
  venues: VenuesState;
  bands: BandsState;
  reviews: ReviewsState;
  badges: BadgesState;
}