import '../../../core/api/dio_client.dart';
import '../../../core/api/api_config.dart';
import '../domain/user_statistics.dart';

class ProfileRepository {
  final DioClient _dioClient;

  ProfileRepository({required DioClient dioClient}) : _dioClient = dioClient;

  /// Get user statistics
  Future<UserStatistics> getUserStatistics() async {
    try {
      final response = await _dioClient.get('${ApiConfig.auth}/me/statistics');
      return UserStatistics.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Upload profile image
  Future<String> uploadProfileImage(String filePath) async {
    try {
      // In a real implementation, this would upload the file
      // For now, we'll return a placeholder
      // You would use FormData from dio to upload the file
      final response = await _dioClient.post(
        '${ApiConfig.auth}/me/profile-image',
        data: {'imagePath': filePath},
      );
      return response.data['imageUrl'] as String;
    } catch (e) {
      rethrow;
    }
  }
}
