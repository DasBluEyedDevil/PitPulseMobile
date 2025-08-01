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
import { fetchBandById } from '../../store/slices/bandsSlice';
import { fetchReviewsByBand, fetchMyReview } from '../../store/slices/reviewsSlice';
import ReviewCard from '../../components/ReviewCard';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants';
import { getStarIcons, getRatingColor } from '../../utils';

type BandDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BandDetail'>;
type BandDetailScreenRouteProp = RouteProp<RootStackParamList, 'BandDetail'>;

interface Props {
  navigation: BandDetailScreenNavigationProp;
  route: BandDetailScreenRouteProp;
}

const BandDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bandId } = route.params;
  const dispatch = useAppDispatch();
  const { currentBand, isLoading } = useAppSelector((state) => state.bands);
  const { reviews } = useAppSelector((state) => state.reviews);
  const { user } = useAppSelector((state) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);

  useEffect(() => {
    loadBandData();
    checkUserReview();
  }, [dispatch, bandId]);

  const loadBandData = async () => {
    try {
      await Promise.all([
        dispatch(fetchBandById(bandId)),
        dispatch(fetchReviewsByBand({ bandId, params: { limit: 10 } })),
      ]);
    } catch (error) {
      console.error('Error loading band data:', error);
    }
  };

  const checkUserReview = async () => {
    if (user) {
      try {
        const result = await dispatch(fetchMyReview({ bandId }));
        setUserReview(result.payload as Review | null);
      } catch (error) {
        console.error('Error checking user review:', error);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBandData();
    await checkUserReview();
    setRefreshing(false);
  };

  const handleWriteReview = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to write a review');
      return;
    }
    navigation.navigate('CreateReview', { bandId });
  };

  const handleEditReview = () => {
    if (userReview) {
      navigation.navigate('CreateReview', { bandId, reviewId: userReview.id });
    }
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  const renderReview = ({ item }: { item: Review }) => (
    <ReviewCard
      review={item}
      onPress={() => navigation.navigate('ReviewDetail', { reviewId: item.id })}
      onUserPress={() => navigation.navigate('Profile', { userId: item.userId })}
      showHelpfulButtons={true}
    />
  );

  if (!currentBand) {
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
          {currentBand.imageUrl ? (
            <Image source={{ uri: currentBand.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="musical-notes" size={64} color={COLORS.gray500} />
            </View>
          )}
        </View>

        {/* Header Info */}
        <View style={styles.headerSection}>
          <Text style={styles.bandName}>{currentBand.name}</Text>
          
          {currentBand.genre && (
            <Text style={styles.genre}>{currentBand.genre}</Text>
          )}

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {getStarIcons(currentBand.averageRating).map((icon, index) => (
                <Ionicons
                  key={index}
                  name={icon}
                  size={20}
                  color={getRatingColor(currentBand.averageRating)}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {currentBand.averageRating.toFixed(1)} ({currentBand.totalReviews} reviews)
            </Text>
          </View>

          {/* Description */}
          {currentBand.description && (
            <Text style={styles.description}>{currentBand.description}</Text>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>About</Text>
          
          {/* Hometown */}
          {currentBand.hometown && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>From</Text>
                <Text style={styles.detailText}>{currentBand.hometown}</Text>
              </View>
            </View>
          )}

          {/* Formed Year */}
          {currentBand.formedYear && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Formed</Text>
                <Text style={styles.detailText}>{currentBand.formedYear}</Text>
              </View>
            </View>
          )}

          {/* Genre */}
          {currentBand.genre && (
            <View style={styles.detailRow}>
              <Ionicons name="musical-note-outline" size={20} color={COLORS.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Genre</Text>
                <Text style={styles.detailText}>{currentBand.genre}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Links Section */}
        {(currentBand.websiteUrl || currentBand.spotifyUrl || currentBand.instagramUrl || currentBand.facebookUrl) && (
          <View style={styles.linksSection}>
            <Text style={styles.sectionTitle}>Links</Text>
            
            {currentBand.websiteUrl && (
              <TouchableOpacity 
                style={styles.linkRow} 
                onPress={() => handleOpenLink(currentBand.websiteUrl!)}
              >
                <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
                <Text style={styles.linkText}>Official Website</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray500} />
              </TouchableOpacity>
            )}

            {currentBand.spotifyUrl && (
              <TouchableOpacity 
                style={styles.linkRow} 
                onPress={() => handleOpenLink(currentBand.spotifyUrl!)}
              >
                <Ionicons name="musical-notes-outline" size={20} color="#1DB954" />
                <Text style={styles.linkText}>Listen on Spotify</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray500} />
              </TouchableOpacity>
            )}

            {currentBand.instagramUrl && (
              <TouchableOpacity 
                style={styles.linkRow} 
                onPress={() => handleOpenLink(currentBand.instagramUrl!)}
              >
                <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                <Text style={styles.linkText}>Follow on Instagram</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray500} />
              </TouchableOpacity>
            )}

            {currentBand.facebookUrl && (
              <TouchableOpacity 
                style={styles.linkRow} 
                onPress={() => handleOpenLink(currentBand.facebookUrl!)}
              >
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                <Text style={styles.linkText}>Like on Facebook</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray500} />
              </TouchableOpacity>
            )}
          </View>
        )}

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
            <Text style={styles.sectionTitle}>Reviews ({currentBand.totalReviews})</Text>
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
              <Text style={styles.emptyStateSubtext}>Be the first to review this band!</Text>
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
  bandName: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  genre: {
    fontSize: TYPOGRAPHY.fontSize.lg,
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
  linksSection: {
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
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  detailText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  linkText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    marginLeft: SPACING.base,
    flex: 1,
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

export default BandDetailScreen;