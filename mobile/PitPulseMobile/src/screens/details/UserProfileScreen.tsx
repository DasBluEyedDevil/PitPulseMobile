import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, UserBadge, Review } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUserBadges } from '../../store/slices/badgesSlice';
import { fetchReviewsByUser } from '../../store/slices/reviewsSlice';
import ReviewCard from '../../components/ReviewCard';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants';
import { getInitials } from '../../utils';
import apiService from '../../services/api';

type UserProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;
type UserProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: UserProfileScreenNavigationProp;
  route: UserProfileScreenRouteProp;
}

const UserProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId } = route.params;
  const dispatch = useAppDispatch();
  const { userBadges } = useAppSelector((state) => state.badges);
  const { userReviews } = useAppSelector((state) => state.reviews);
  
  const [profileUser, setProfileUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'reviews' | 'badges'>('reviews');

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [dispatch, userId]);

  const loadUserProfile = async () => {
    if (!userId) return;

    try {
      // Fetch user profile from API
      const response = await fetch(`/api/users/${userId}`);
      const userData = await response.json();
      setProfileUser(userData.data);

      // Load user's data
      await Promise.all([
        dispatch(fetchUserBadges(userId)),
        dispatch(fetchReviewsByUser({ userId, params: { limit: 20 } })),
      ]);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  const renderBadge = ({ item }: { item: UserBadge }) => (
    <View style={styles.badgeItem}>
      <View style={[styles.badgeIcon, { backgroundColor: item.badge?.color || COLORS.primary }]}>
        <Text style={styles.badgeEmoji}>🏆</Text>
      </View>
      <Text style={styles.badgeName} numberOfLines={2}>
        {item.badge?.name}
      </Text>
      <Text style={styles.badgeDate}>
        {new Date(item.earnedAt).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <ReviewCard
      review={item}
      onPress={() => navigation.navigate('ReviewDetail', { reviewId: item.id })}
      showHelpfulButtons={false}
    />
  );

  if (!profileUser) {
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
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profileUser.profileImageUrl ? (
              <Image source={{ uri: profileUser.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(profileUser.firstName, profileUser.lastName)}
                </Text>
              </View>
            )}
            {profileUser.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              </View>
            )}
          </View>
          
          <Text style={styles.displayName}>
            {profileUser.firstName} {profileUser.lastName}
          </Text>
          <Text style={styles.username}>@{profileUser.username}</Text>
          
          {profileUser.bio && (
            <Text style={styles.bio}>{profileUser.bio}</Text>
          )}
          
          {profileUser.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.location}>{profileUser.location}</Text>
            </View>
          )}

          <Text style={styles.joinDate}>
            Joined {new Date(profileUser.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileUser.stats?.reviewCount || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userBadges.length}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileUser.stats?.followerCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileUser.stats?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
              Reviews
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'badges' && styles.activeTab]}
            onPress={() => setActiveTab('badges')}
          >
            <Text style={[styles.tabText, activeTab === 'badges' && styles.activeTabText]}>
              Badges
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'reviews' ? (
            userReviews.length > 0 ? (
              <FlatList
                data={userReviews}
                renderItem={renderReview}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="star-outline" size={48} color={COLORS.gray400} />
                <Text style={styles.emptyStateText}>No reviews yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  {profileUser.username} hasn't written any reviews
                </Text>
              </View>
            )
          ) : (
            userBadges.length > 0 ? (
              <FlatList
                data={userBadges}
                renderItem={renderBadge}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.badgeRow}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color={COLORS.gray400} />
                <Text style={styles.emptyStateText}>No badges earned</Text>
                <Text style={styles.emptyStateSubtext}>
                  {profileUser.username} hasn't earned any badges yet
                </Text>
              </View>
            )
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
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.lg,
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
    marginBottom: SPACING.sm,
  },
  location: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  joinDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginBottom: SPACING.base,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  tabContent: {
    backgroundColor: COLORS.white,
    paddingTop: SPACING.base,
  },
  badgeRow: {
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.base,
  },
  badgeItem: {
    alignItems: 'center',
    width: '45%',
    marginBottom: SPACING.lg,
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
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  badgeDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
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

export default UserProfileScreen;