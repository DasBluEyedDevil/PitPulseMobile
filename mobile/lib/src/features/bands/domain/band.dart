import 'package:freezed_annotation/freezed_annotation.dart';

part 'band.freezed.dart';
part 'band.g.dart';

@freezed
class Band with _$Band {
  const factory Band({
    required String id,
    required String name,
    required double averageRating, required int totalReviews, required bool isActive, required String createdAt, required String updatedAt, String? description,
    String? genre,
    int? formedYear,
    String? websiteUrl,
    String? spotifyUrl,
    String? instagramUrl,
    String? facebookUrl,
    String? imageUrl,
    String? hometown,
  }) = _Band;

  factory Band.fromJson(Map<String, dynamic> json) => _$BandFromJson(json);
}

@freezed
class CreateBandRequest with _$CreateBandRequest {
  const factory CreateBandRequest({
    required String name,
    String? description,
    String? genre,
    int? formedYear,
    String? websiteUrl,
    String? spotifyUrl,
    String? instagramUrl,
    String? facebookUrl,
    String? imageUrl,
    String? hometown,
  }) = _CreateBandRequest;

  factory CreateBandRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateBandRequestFromJson(json);
}
