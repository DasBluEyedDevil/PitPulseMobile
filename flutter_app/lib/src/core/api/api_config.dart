/// API Configuration
class ApiConfig {
  ApiConfig._();

  // Base URL - Update this to match your backend server
  static const String baseUrl = 'http://localhost:3000/api';
  
  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
  
  // Endpoints
  static const String auth = '/users';
  static const String venues = '/venues';
  static const String bands = '/bands';
  static const String reviews = '/reviews';
  static const String badges = '/badges';
  
  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
}
