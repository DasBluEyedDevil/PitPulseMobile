import 'package:freezed_annotation/freezed_annotation.dart';

part 'venue.freezed.dart';
part 'venue.g.dart';

enum VenueType {
  @JsonValue('concert_hall')
  concertHall,
  @JsonValue('club')
  club,
  @JsonValue('arena')
  arena,
  @JsonValue('outdoor')
  outdoor,
  @JsonValue('bar')
  bar,
  @JsonValue('theater')
  theater,
  @JsonValue('stadium')
  stadium,
  @JsonValue('other')
  other,
}

@freezed
class Venue with _$Venue {
  const factory Venue({
    required String id,
    required String name,
    required double averageRating, required int totalReviews, required bool isActive, required String createdAt, required String updatedAt, String? description,
    String? address,
    String? city,
    String? state,
    String? country,
    String? postalCode,
    double? latitude,
    double? longitude,
    String? websiteUrl,
    String? phone,
    String? email,
    int? capacity,
    VenueType? venueType,
    String? imageUrl,
  }) = _Venue;

  factory Venue.fromJson(Map<String, dynamic> json) => _$VenueFromJson(json);
}

@freezed
class CreateVenueRequest with _$CreateVenueRequest {
  const factory CreateVenueRequest({
    required String name,
    String? description,
    String? address,
    String? city,
    String? state,
    String? country,
    String? postalCode,
    double? latitude,
    double? longitude,
    String? websiteUrl,
    String? phone,
    String? email,
    int? capacity,
    VenueType? venueType,
    String? imageUrl,
  }) = _CreateVenueRequest;

  factory CreateVenueRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateVenueRequestFromJson(json);
}
