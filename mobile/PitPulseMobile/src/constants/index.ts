// App constants for PitPulse mobile application

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:3000/api' : 'https://your-api-domain.com/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Colors (Blue and White theme as specified)
export const COLORS = {
  // Primary Blues
  primary: '#2196F3',
  primaryDark: '#1976D2',
  primaryLight: '#BBDEFB',
  
  // Secondary
  secondary: '#03DAC6',
  secondaryDark: '#018786',
  
  // Grays
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Status Colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Rating Colors
  rating1: '#F44336', // Red
  rating2: '#FF5722', // Deep Orange
  rating3: '#FF9800', // Orange
  rating4: '#FFC107', // Amber
  rating5: '#4CAF50', // Green
  
  // Background
  background: '#FAFAFA',
  surface: '#FFFFFF',
  
  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#000000',
};

// Typography
export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const BORDER_RADIUS = {
  sm: 4,
  base: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Venue Types
export const VENUE_TYPES = [
  { value: 'concert_hall', label: 'Concert Hall' },
  { value: 'club', label: 'Club' },
  { value: 'arena', label: 'Arena' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'bar', label: 'Bar' },
  { value: 'theater', label: 'Theater' },
  { value: 'stadium', label: 'Stadium' },
  { value: 'other', label: 'Other' },
];

// Music Genres (common ones)
export const MUSIC_GENRES = [
  'Rock', 'Pop', 'Hip Hop', 'Electronic', 'Jazz', 'Blues', 'Country',
  'Classical', 'Reggae', 'Folk', 'Punk', 'Metal', 'Alternative',
  'Indie', 'R&B', 'Soul', 'Funk', 'Gospel', 'World', 'Latin',
  'Acoustic', 'Experimental', 'Ambient', 'House', 'Techno', 'Dubstep',
];

// Rating Configuration
export const RATING_CONFIG = {
  min: 1,
  max: 5,
  step: 1,
  labels: {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent',
  },
};

// Pagination
export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
};

// Image Configuration
export const IMAGE_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  quality: 0.8,
  maxWidth: 1200,
  maxHeight: 1200,
};

// Storage Keys for AsyncStorage
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@pitpulse_auth_token',
  USER_DATA: '@pitpulse_user_data',
  ONBOARDING_COMPLETE: '@pitpulse_onboarding_complete',
  SEARCH_HISTORY: '@pitpulse_search_history',
  FAVORITES: '@pitpulse_favorites',
};

// Screen Names
export const SCREEN_NAMES = {
  // Auth Stack
  WELCOME: 'Welcome',
  LOGIN: 'Login',
  REGISTER: 'Register',
  
  // Main Stack
  MAIN: 'Main',
  HOME: 'Home',
  VENUES: 'Venues',
  BANDS: 'Bands',
  PROFILE: 'Profile',
  
  // Detail Screens
  VENUE_DETAIL: 'VenueDetail',
  BAND_DETAIL: 'BandDetail',
  REVIEW_DETAIL: 'ReviewDetail',
  USER_PROFILE: 'UserProfile',
  
  // Forms
  CREATE_REVIEW: 'CreateReview',
  EDIT_PROFILE: 'EditProfile',
  
  // Other
  SEARCH: 'Search',
  SETTINGS: 'Settings',
  BADGES: 'Badges',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Please login to continue.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  
  // Auth specific
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_ALREADY_EXISTS: 'Email already registered.',
  USERNAME_ALREADY_EXISTS: 'Username already taken.',
  WEAK_PASSWORD: 'Password must be at least 8 characters long.',
  
  // Form validation
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  RATING_REQUIRED: 'Please select a rating.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: 'Account created successfully!',
  LOGIN_SUCCESS: 'Welcome back!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  REVIEW_CREATED: 'Review posted successfully!',
  REVIEW_UPDATED: 'Review updated successfully!',
  REVIEW_DELETED: 'Review deleted successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully.',
};

// Animation Durations (in milliseconds)
export const ANIMATION = {
  fast: 200,
  normal: 300,
  slow: 500,
};

// Badge Colors
export const BADGE_COLORS = {
  review_count: '#4CAF50',
  venue_explorer: '#2196F3',
  music_lover: '#E91E63',
  event_attendance: '#795548',
  helpful_count: '#607D8B',
} as const;

// App Metadata
export const APP_INFO = {
  name: 'PitPulse',
  version: '1.0.0',
  description: 'Discover and review concert venues and bands',
  supportEmail: 'support@pitpulse.com',
  privacyPolicyUrl: 'https://pitpulse.com/privacy',
  termsOfServiceUrl: 'https://pitpulse.com/terms',
};