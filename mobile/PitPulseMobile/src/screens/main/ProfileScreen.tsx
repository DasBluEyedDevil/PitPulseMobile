import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList, UserBadge } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout, getCurrentUser } from '../../store/slices/authSlice';
import { fetchUserBadges, fetchBadgeProgress } from '../../store/slices/badgesSlice';
import { fetchReviewsByUser } from '../../store/slices/reviewsSlice';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, BADGE_COLORS } from '../../constants';
import { getInitials, formatBadgeType } from '../../utils';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { userBadges, badgeProgress } = useAppSelector((state) => state.badges);
  const { userReviews } = useAppSelector((state) => state.reviews);
  
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [dispatch, user]);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      await Promise.all([
        dispatch(getCurrentUser()),
        dispatch(fetchUserBadges()),
        dispatch(fetchBadgeProgress()),
        dispatch(fetchReviewsByUser({ userId: user.id, params: { limit: 5 } })),
      ]);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => dispatch(logout())
        },
      ]
    );
  };

  const renderBadge = (userBadge: UserBadge) => (
    <View key={userBadge.id} style={styles.badgeItem}>
      <View style={[styles.badgeIcon, { backgroundColor: userBadge.badge?.color || COLORS.primary }]}>
        <Text style={styles.badgeEmoji}>🏆</Text>
      </View>
      <Text style={styles.badgeName} numberOfLines={1}>
        {userBadge.badge?.name}
      </Text>
    </View>
  );

  if (!user) {
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.settingsButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(user.firstName, user.lastName)}
                </Text>
              </View>
            )}
            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              </View>
            )}
          </View>
          
          <Text style={styles.displayName}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.username}>@{user.username}</Text>
          
          {user.bio && (
            <Text style={styles.bio}>{user.bio}</Text>
          )}
          
          {user.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.location}>{user.location}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.stats?.reviewCount || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userBadges.length}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.stats?.followerCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.stats?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {userBadges.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesContainer}
            >
              {userBadges.slice(0, 5).map(renderBadge)}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={COLORS.gray400} />
              <Text style={styles.emptyStateText}>No badges earned yet</Text>
              <Text style={styles.emptyStateSubtext}>Write reviews to earn your first badge!</Text>
            </View>
          )}
        </View>

        {/* Badge Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badge Progress</Text>
          {badgeProgress.slice(0, 3).map((progress, index) => (
            <View key={progress.badge.id} style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressName}>{progress.badge.name}</Text>
                <Text style={styles.progressPercent}>{progress.progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${progress.progress}%`,
                      backgroundColor: progress.badge.color || COLORS.primary
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressDescription}>{progress.badge.description}</Text>
            </View>
          ))}
        </View>

        {/* Recent Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {userReviews.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {userReviews.length > 0 ? (
            userReviews.slice(0, 3).map((review) => (
              <TouchableOpacity 
                key={review.id} 
                style={styles.reviewItem}
                onPress={() => navigation.navigate('ReviewDetail', { reviewId: review.id })}
              >
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewRating}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < review.rating ? 'star' : 'star-outline'}
                        size={16}
                        color={COLORS.rating4}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.reviewTarget}>
                  {review.venue ? `🏛️ ${review.venue.name}` : `🎵 ${review.band?.name}`}
                </Text>
                {review.title && (
                  <Text style={styles.reviewTitle} numberOfLines={1}>
                    {review.title}
                  </Text>
                )}
                {review.content && (
                  <Text style={styles.reviewContent} numberOfLines={2}>
                    {review.content}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color={COLORS.gray400} />
              <Text style={styles.emptyStateText}>No reviews yet</Text>
              <Text style={styles.emptyStateSubtext}>Share your concert experiences!</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  settingsButton: {
    padding: SPACING.sm,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.base,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.base,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 2,
  },
  displayName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  username: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  bio: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.base,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  location: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.base,
    marginBottom: SPACING.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.base,
    paddingVertical: SPACING.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.base,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  badgesContainer: {
    paddingHorizontal: SPACING.base,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: SPACING.base,
    width: 80,
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeName: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  progressItem: {
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.base,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  progressName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  progressPercent: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.gray200,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  reviewItem: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  reviewTarget: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: SPACING.xs,
  },
  reviewTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  reviewContent: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.base,
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

export default ProfileScreen;