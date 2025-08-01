import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList, Venue, Band, Review } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchPopularVenues } from '../../store/slices/venuesSlice';
import { fetchPopularBands, fetchTrendingBands } from '../../store/slices/bandsSlice';
import { fetchReviews } from '../../store/slices/reviewsSlice';
import { checkAndAwardBadges } from '../../store/slices/badgesSlice';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants';
import { formatRelativeTime, truncateText } from '../../utils';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { popularVenues, isLoading: venuesLoading } = useAppSelector((state) => state.venues);
  const { popularBands, trendingBands, isLoading: bandsLoading } = useAppSelector((state) => state.bands);
  const { reviews, isLoading: reviewsLoading } = useAppSelector((state) => state.reviews);
  
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    // Check for new badge awards when user enters home
    if (user) {
      dispatch(checkAndAwardBadges()).then((result: any) => {
        if (result.payload?.newBadges?.length > 0) {
          Alert.alert(
            'New Badge Earned! 🏆',
            `You earned ${result.payload.newBadges.length} new badge${result.payload.newBadges.length > 1 ? 's' : ''}!`,
            [{ text: 'Awesome!', style: 'default' }]
          );
        }
      });
    }
  }, [dispatch, user]);

  const loadData = async () => {
    try {
      await Promise.all([
        dispatch(fetchPopularVenues(5)),
        dispatch(fetchPopularBands(5)),
        dispatch(fetchTrendingBands(3)),
        dispatch(fetchReviews({ limit: 10, sort: 'created_at', order: 'desc' })),
      ]);
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderVenueItem = ({ item }: { item: Venue }) => (
    <TouchableOpacity
      style={styles.venueCard}
      onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
    >
      <View style={styles.venueInfo}>
        <Text style={styles.venueName}>{item.name}</Text>
        <Text style={styles.venueLocation}>{item.city}, {item.state}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color={COLORS.rating4} />
          <Text style={styles.ratingText}>{item.averageRating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({item.totalReviews} reviews)</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderBandItem = ({ item }: { item: Band }) => (
    <TouchableOpacity
      style={styles.bandCard}
      onPress={() => navigation.navigate('BandDetail', { bandId: item.id })}
    >
      <View style={styles.bandInfo}>
        <Text style={styles.bandName}>{item.name}</Text>
        <Text style={styles.bandGenre}>{item.genre}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color={COLORS.rating4} />
          <Text style={styles.ratingText}>{item.averageRating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({item.totalReviews} reviews)</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderReviewItem = ({ item }: { item: Review }) => (
    <TouchableOpacity
      style={styles.reviewCard}
      onPress={() => navigation.navigate('ReviewDetail', { reviewId: item.id })}
    >
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewUser}>{item.user?.username || 'Anonymous'}</Text>
        <Text style={styles.reviewTime}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
      <View style={styles.reviewRating}>
        {[...Array(5)].map((_, i) => (
          <Ionicons
            key={i}
            name={i < item.rating ? 'star' : 'star-outline'}
            size={16}
            color={COLORS.rating4}
          />
        ))}
      </View>
      {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
      {item.content && (
        <Text style={styles.reviewContent}>{truncateText(item.content, 100)}</Text>
      )}
      <Text style={styles.reviewTarget}>
        {item.venue ? `📍 ${item.venue.name}` : `🎵 ${item.band?.name}`}
      </Text>
    </TouchableOpacity>
  );

  const isLoading = venuesLoading || bandsLoading || reviewsLoading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! 👋
          </Text>
          <Text style={styles.subWelcomeText}>
            Discover amazing venues and bands
          </Text>
        </View>

        {/* Popular Venues Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Venues</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Venues')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popularVenues}
            renderItem={renderVenueItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Trending Bands Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Bands</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bands')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={trendingBands}
            renderItem={renderBandItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Popular Bands Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Bands</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bands')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popularBands}
            renderItem={renderBandItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Recent Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
          </View>
          {reviews.slice(0, 5).map((review) => (
            <View key={review.id}>{renderReviewItem({ item: review })}</View>
          ))}
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
  welcomeSection: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.base,
  },
  welcomeText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  subWelcomeText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
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
  horizontalList: {
    paddingHorizontal: SPACING.lg,
  },
  venueCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.base,
    marginRight: SPACING.base,
    width: 200,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  venueLocation: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  bandCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.base,
    marginRight: SPACING.base,
    width: 180,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bandInfo: {
    flex: 1,
  },
  bandName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  bandGenre: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
  },
  reviewCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.base,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.base,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  reviewUser: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  reviewTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  reviewRating: {
    flexDirection: 'row',
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
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  reviewTarget: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default HomeScreen;