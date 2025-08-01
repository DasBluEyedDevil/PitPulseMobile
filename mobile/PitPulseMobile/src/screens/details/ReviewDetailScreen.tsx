import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchReviewById, deleteReview, markReviewHelpful } from '../../store/slices/reviewsSlice';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants';
import { formatDateTime, getRatingColor, getInitials } from '../../utils';

type ReviewDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ReviewDetail'>;
type ReviewDetailScreenRouteProp = RouteProp<RootStackParamList, 'ReviewDetail'>;

interface Props {
  navigation: ReviewDetailScreenNavigationProp;
  route: ReviewDetailScreenRouteProp;
}

const ReviewDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { reviewId } = route.params;
  const dispatch = useAppDispatch();
  const { currentReview, isLoading } = useAppSelector((state) => state.reviews);
  const { user } = useAppSelector((state) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReview();
  }, [dispatch, reviewId]);

  const loadReview = async () => {
    try {
      await dispatch(fetchReviewById(reviewId));
    } catch (error) {
      console.error('Error loading review:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReview();
    setRefreshing(false);
  };

  const handleEditReview = () => {
    if (currentReview) {
      navigation.navigate('CreateReview', {
        venueId: currentReview.venueId,
        bandId: currentReview.bandId,
        reviewId: currentReview.id,
      });
    }
  };

  const handleDeleteReview = () => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteReview(reviewId));
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete review');
            }
          },
        },
      ]
    );
  };

  const handleMarkHelpful = async (isHelpful: boolean) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to mark reviews as helpful');
      return;
    }

    try {
      await dispatch(markReviewHelpful({ reviewId, isHelpful }));
      await loadReview(); // Refresh to get updated helpful count
    } catch (error) {
      Alert.alert('Error', 'Failed to mark review');
    }
  };

  const handleUserPress = () => {
    if (currentReview?.user) {
      navigation.navigate('Profile', { userId: currentReview.userId });
    }
  };

  const handleTargetPress = () => {
    if (currentReview?.venue) {
      navigation.navigate('VenueDetail', { venueId: currentReview.venueId! });
    } else if (currentReview?.band) {
      navigation.navigate('BandDetail', { bandId: currentReview.bandId! });
    }
  };

  if (!currentReview) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  const isOwnReview = user?.id === currentReview.userId;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          {/* User Info */}
          <TouchableOpacity style={styles.userContainer} onPress={handleUserPress}>
            <View style={styles.avatar}>
              {currentReview.user?.profileImageUrl ? (
                <Image 
                  source={{ uri: currentReview.user.profileImageUrl }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(currentReview.user?.firstName, currentReview.user?.lastName)}
                </Text>
              )}
            </View>
            <View style={styles.userInfo}>
              <View style={styles.usernameContainer}>
                <Text style={styles.username}>
                  {currentReview.user?.username || 'Anonymous'}
                </Text>
                {currentReview.user?.isVerified && (
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                )}
              </View>
              <Text style={styles.timestamp}>
                {formatDateTime(currentReview.createdAt)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.gray500} />
          </TouchableOpacity>

          {/* Action Buttons */}
          {isOwnReview && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditReview}>
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteReview}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Target */}
        <TouchableOpacity style={styles.targetSection} onPress={handleTargetPress}>
          <View style={styles.targetInfo}>
            <Text style={styles.targetLabel}>
              {currentReview.venue ? 'Venue' : 'Band'}
            </Text>
            <Text style={styles.targetName}>
              {currentReview.venue?.name || currentReview.band?.name}
            </Text>
            {currentReview.venue && (
              <Text style={styles.targetDetails}>
                {currentReview.venue.city}, {currentReview.venue.state}
              </Text>
            )}
            {currentReview.band && (
              <Text style={styles.targetDetails}>
                {currentReview.band.genre}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.gray500} />
        </TouchableOpacity>

        {/* Rating */}
        <View style={styles.ratingSection}>
          <View style={styles.starsContainer}>
            {[...Array(5)].map((_, i) => (
              <Ionicons
                key={i}
                name={i < currentReview.rating ? 'star' : 'star-outline'}
                size={32}
                color={getRatingColor(currentReview.rating)}
              />
            ))}
          </View>
          <Text style={styles.ratingText}>
            {currentReview.rating} out of 5 stars
          </Text>
        </View>

        {/* Event Date */}
        {currentReview.eventDate && (
          <View style={styles.eventSection}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.eventText}>
              Event Date: {new Date(currentReview.eventDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Title */}
        {currentReview.title && (
          <View style={styles.titleSection}>
            <Text style={styles.title}>{currentReview.title}</Text>
          </View>
        )}

        {/* Content */}
        {currentReview.content && (
          <View style={styles.contentSection}>
            <Text style={styles.content}>{currentReview.content}</Text>
          </View>
        )}

        {/* Images */}
        {currentReview.imageUrls && currentReview.imageUrls.length > 0 && (
          <View style={styles.imagesSection}>
            <Text style={styles.imagesTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {currentReview.imageUrls.map((imageUrl, index) => (
                <Image key={index} source={{ uri: imageUrl }} style={styles.reviewImage} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Helpful Section */}
        <View style={styles.helpfulSection}>
          <View style={styles.helpfulInfo}>
            <Ionicons name="thumbs-up-outline" size={20} color={COLORS.gray500} />
            <Text style={styles.helpfulCount}>
              {currentReview.helpfulCount} people found this helpful
            </Text>
          </View>

          {!isOwnReview && user && (
            <View style={styles.helpfulButtons}>
              <TouchableOpacity
                style={styles.helpfulButton}
                onPress={() => handleMarkHelpful(true)}
              >
                <Ionicons name="thumbs-up-outline" size={18} color={COLORS.primary} />
                <Text style={styles.helpfulButtonText}>Helpful</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notHelpfulButton}
                onPress={() => handleMarkHelpful(false)}
              >
                <Ionicons name="thumbs-down-outline" size={18} color={COLORS.gray500} />
                <Text style={styles.notHelpfulButtonText}>Not helpful</Text>
              </TouchableOpacity>
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
  headerSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  userInfo: {
    flex: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  timestamp: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginLeft: SPACING.xs,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginLeft: SPACING.xs,
  },
  targetSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetInfo: {
    flex: 1,
  },
  targetLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  targetName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  targetDetails: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  ratingSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
  },
  eventSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  eventText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  titleSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    lineHeight: 28,
  },
  contentSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  content: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  imagesSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  imagesTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
  },
  reviewImage: {
    width: 150,
    height: 150,
    borderRadius: BORDER_RADIUS.base,
    marginRight: SPACING.base,
  },
  helpfulSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
  },
  helpfulInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  helpfulCount: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  helpfulButtons: {
    flexDirection: 'row',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
    backgroundColor: COLORS.primaryLight,
    marginRight: SPACING.sm,
  },
  helpfulButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginLeft: SPACING.xs,
  },
  notHelpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
    backgroundColor: COLORS.gray200,
  },
  notHelpfulButtonText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginLeft: SPACING.xs,
  },
});

export default ReviewDetailScreen;