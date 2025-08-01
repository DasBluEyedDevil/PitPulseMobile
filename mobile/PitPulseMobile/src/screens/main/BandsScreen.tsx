import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList, Band } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { searchBands, fetchPopularBands, fetchTrendingBands, fetchGenres } from '../../store/slices/bandsSlice';
import BandCard from '../../components/BandCard';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants';
import { debounce } from '../../utils';

type BandsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Bands'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: BandsScreenNavigationProp;
}

const BandsScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { bands, popularBands, trendingBands, genres, searchResults, isLoading } = useAppSelector((state) => state.bands);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'trending' | 'all'>('popular');

  useEffect(() => {
    loadInitialData();
  }, [dispatch]);

  const loadInitialData = async () => {
    await Promise.all([
      dispatch(fetchPopularBands(20)),
      dispatch(fetchTrendingBands(10)),
      dispatch(fetchGenres()),
    ]);
  };

  // Debounced search function
  const debouncedSearch = debounce((query: string, genre: string, rating: number | '') => {
    const searchParams = {
      q: query,
      genre: genre || undefined,
      rating: rating || undefined,
      limit: 50,
    };
    
    if (query || genre || rating) {
      dispatch(searchBands(searchParams));
      setActiveTab('all');
    }
  }, 500);

  useEffect(() => {
    debouncedSearch(searchQuery, selectedGenre, minRating);
  }, [searchQuery, selectedGenre, minRating]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
    setMinRating('');
    setShowFilters(false);
    setActiveTab('popular');
  };

  const getDisplayBands = () => {
    if (searchResults?.bands) return searchResults.bands;
    
    switch (activeTab) {
      case 'trending':
        return trendingBands;
      case 'all':
        return bands;
      case 'popular':
      default:
        return popularBands;
    }
  };

  const renderBand = ({ item }: { item: Band }) => (
    <BandCard
      band={item}
      onPress={() => navigation.navigate('BandDetail', { bandId: item.id })}
    />
  );

  const FilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter Bands</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Genre Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Genre</Text>
            <View style={styles.genreButtons}>
              <TouchableOpacity
                style={[styles.genreButton, !selectedGenre && styles.genreButtonSelected]}
                onPress={() => setSelectedGenre('')}
              >
                <Text style={[styles.genreButtonText, !selectedGenre && styles.genreButtonTextSelected]}>
                  All Genres
                </Text>
              </TouchableOpacity>
              {genres.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[styles.genreButton, selectedGenre === genre && styles.genreButtonSelected]}
                  onPress={() => setSelectedGenre(selectedGenre === genre ? '' : genre)}
                >
                  <Text style={[styles.genreButtonText, selectedGenre === genre && styles.genreButtonTextSelected]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Minimum Rating</Text>
            <View style={styles.ratingButtons}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[styles.ratingButton, minRating === rating && styles.ratingButtonSelected]}
                  onPress={() => setMinRating(minRating === rating ? '' : rating)}
                >
                  <Ionicons name="star" size={20} color={minRating === rating ? COLORS.white : COLORS.rating4} />
                  <Text style={[styles.ratingButtonText, minRating === rating && styles.ratingButtonTextSelected]}>
                    {rating}+
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Clear Filters Button */}
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear All Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray500} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bands..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      {!searchQuery && !selectedGenre && !minRating && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'popular' && styles.activeTab]}
            onPress={() => setActiveTab('popular')}
          >
            <Text style={[styles.tabText, activeTab === 'popular' && styles.activeTabText]}>
              Popular
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
            onPress={() => setActiveTab('trending')}
          >
            <Text style={[styles.tabText, activeTab === 'trending' && styles.activeTabText]}>
              Trending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Filters */}
      {(selectedGenre || minRating) && (
        <View style={styles.activeFilters}>
          {selectedGenre && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>🎵 {selectedGenre}</Text>
              <TouchableOpacity onPress={() => setSelectedGenre('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>
          )}
          {minRating && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>⭐ {minRating}+</Text>
              <TouchableOpacity onPress={() => setMinRating('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Results */}
      <FlatList
        data={getDisplayBands()}
        renderItem={renderBand}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />

      <FilterModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    marginRight: SPACING.sm,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
  },
  filterButton: {
    padding: SPACING.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.base,
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
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  activeFilterText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  listContainer: {
    padding: SPACING.base,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.base,
  },
  filterSection: {
    marginBottom: SPACING.lg,
  },
  filterLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  genreButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 20,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  genreButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genreButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  genreButtonTextSelected: {
    color: COLORS.white,
  },
  ratingButtons: {
    flexDirection: 'row',
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 20,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
  },
  ratingButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ratingButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  ratingButtonTextSelected: {
    color: COLORS.white,
  },
  clearButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  clearButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default BandsScreen;