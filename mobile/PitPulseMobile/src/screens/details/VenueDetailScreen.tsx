import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Review } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchVenueById } from '../../store/slices/venuesSlice';
import { fetchReviewsByVenue, fetchMyReview } from '../../store/slices/reviewsSlice';
import ReviewCard from '../../components/ReviewCard';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants';
import { getStarIcons, getRatingColor, capitalizeWords } from '../../utils';

type VenueDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VenueDetail'>;
type VenueDetailScreenRouteProp = RouteProp<RootStackParamList, 'VenueDetail'>;

interface Props {
  navigation: VenueDetailScreenNavigationProp;
  route: VenueDetailScreenRouteProp;
}

const VenueDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { venueId } = route.params;
  const dispatch = useAppDispatch();
  const { currentVenue, isLoading } = useAppSelector((state) => state.venues);
  const { reviews } = useAppSelector((state) => state.reviews);
  const { user } = useAppSelector((state) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);

  useEffect(() => {
    loadVenueData();
    checkUserReview();
  }, [dispatch, venueId]);

  const loadVenueData = async () => {
    try {
      await Promise.all([
        dispatch(fetchVenueById(venueId)),
        dispatch(fetchReviewsByVenue({ venueId, params: { limit: 10 } })),
      ]);
    } catch (error) {
      console.error('Error loading venue data:', error);
    }
  };

  const checkUserReview = async () => {
    if (user) {
      try {
        const result = await dispatch(fetchMyReview({ venueId }));
        setUserReview(result.payload as Review | null);
      } catch (error) {
        console.error('Error checking user review:', error);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVenueData();
    await checkUserReview();
    setRefreshing(false);
  };

  const handleWriteReview = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to write a review');
      return;
    }
    navigation.navigate('CreateReview', { venueId });
  };

  const handleEditReview = () => {
    if (userReview) {
      navigation.navigate('CreateReview', { venueId, reviewId: userReview.id });
    }
  };

  const handleOpenWebsite = () => {
    if (currentVenue?.websiteUrl) {
      Linking.openURL(currentVenue.websiteUrl);
    }
  };

  const handleOpenMaps = () => {
    if (currentVenue?.latitude && currentVenue?.longitude) {
      const url = `https://maps.google.com/?q=${currentVenue.latitude},${currentVenue.longitude}`;
      Linking.openURL(url);
    } else if (currentVenue?.address) {
      const encodedAddress = encodeURIComponent(
        `${currentVenue.address}, ${currentVenue.city}, ${currentVenue.state}`
      );
      const url = `https://maps.google.com/?q=${encodedAddress}`;
      Linking.openURL(url);
    }
  };

  const renderReview = ({ item }: { item: Review }) => (
    <ReviewCard
      review={item}
      onPress={() => navigation.navigate('ReviewDetail', { reviewId: item.id })}
      onUserPress={() => navigation.navigate('Profile', { userId: item.userId })}
      showHelpfulButtons={true}
    />
  );

  if (!currentVenue) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {currentVenue.imageUrl ? (
            <Image source={{ uri: currentVenue.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="business" size={64} color={COLORS.gray500} />
            </View>
          )}
        </View>

        {/* Header Info */}
        <View style={styles.headerSection}>
          <Text style={styles.venueName}>{currentVenue.name}</Text>
          
          {currentVenue.venueType && (
            <Text style={styles.venueType}>
              {capitalizeWords(currentVenue.venueType.replace('_', ' '))}
            </Text>
          )}

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {getStarIcons(currentVenue.averageRating).map((icon, index) => (
                <Ionicons
                  key={index}
                  name={icon}
                  size={20}
                  color={getRatingColor(currentVenue.averageRating)}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {currentVenue.averageRating.toFixed(1)} ({currentVenue.totalReviews} reviews)
            </Text>
          </View>

          {/* Description */}
          {currentVenue.description && (
            <Text style={styles.description}>{currentVenue.description}</Text>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          {/* Address */}
          {(currentVenue.address || currentVenue.city) && (
            <TouchableOpacity style={styles.detailRow} onPress={handleOpenMaps}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailText}>
                  {currentVenue.address && `${currentVenue.address}\n`}
                  {currentVenue.city}{currentVenue.state && `, ${currentVenue.state}`}
                  {currentVenue.country && `, ${currentVenue.country}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.gray500} />
            </TouchableOpacity>
          )}

          {/* Phone */}
          {currentVenue.phone && (
            <TouchableOpacity 
              style={styles.detailRow}
              onPress={() => Linking.openURL(`tel:${currentVenue.phone}`)}
            >
              <Ionicons name="call-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailText}>{currentVenue.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.gray500} />
            </TouchableOpacity>
          )}

          {/* Website */}
          {currentVenue.websiteUrl && (
            <TouchableOpacity style={styles.detailRow} onPress={handleOpenWebsite}>
              <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailText}>Visit Website</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.gray500} />
            </TouchableOpacity>
          )}

          {/* Capacity */}
          {currentVenue.capacity && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailText}>Capacity: {currentVenue.capacity}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Review Action */}
        <View style={styles.reviewActionSection}>
          {userReview ? (
            <TouchableOpacity style={styles.editReviewButton} onPress={handleEditReview}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.editReviewText}>Edit Your Review</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.writeReviewButton} onPress={handleWriteReview}>
              <Ionicons name="star-outline" size={20} color={COLORS.white} />
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews ({currentVenue.totalReviews})</Text>
          </View>

          {reviews.length > 0 ? (
            <FlatList
              data={reviews}
              renderItem={renderReview}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color={COLORS.gray400} />
              <Text style={styles.emptyStateText}>No reviews yet</Text>
              <Text style={styles.emptyStateSubtext}>Be the first to review this venue!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  venueName: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  venueType: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  stars: {
    flexDirection: 'row',
    marginRight: SPACING.sm,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  detailsSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  detailContent: {
    flex: 1,
    marginLeft: SPACING.base,
  },
  detailText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  reviewActionSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  writeReviewButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
  },
  writeReviewText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginLeft: SPACING.sm,
  },
  editReviewButton: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  editReviewText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginLeft: SPACING.sm,
  },
  reviewsSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
    marginTop: SPACING.base,
  },
  emptyStateSubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});

export default VenueDetailScreen;