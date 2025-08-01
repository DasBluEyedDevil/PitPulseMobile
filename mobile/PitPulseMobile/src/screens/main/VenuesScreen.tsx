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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList, Venue, VenueType } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { searchVenues, fetchPopularVenues } from '../../store/slices/venuesSlice';
import VenueCard from '../../components/VenueCard';
import { COLORS, TYPOGRAPHY, SPACING, VENUE_TYPES } from '../../constants';
import { debounce } from '../../utils';

type VenuesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Venues'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: VenuesScreenNavigationProp;
}

const VenuesScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { venues, popularVenues, searchResults, isLoading } = useAppSelector((state) => state.venues);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState<VenueType | ''>('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [dispatch]);

  const loadInitialData = async () => {
    await dispatch(fetchPopularVenues(20));
  };

  // Debounced search function
  const debouncedSearch = debounce((query: string, city: string, type: VenueType | '', rating: number | '') => {
    const searchParams = {
      q: query,
      city: city || undefined,
      venueType: type || undefined,
      rating: rating || undefined,
      limit: 50,
    };
    
    if (query || city || type || rating) {
      dispatch(searchVenues(searchParams));
    } else {
      // Show popular venues when no search
      dispatch(fetchPopularVenues(20));
    }
  }, 500);

  useEffect(() => {
    debouncedSearch(searchQuery, selectedCity, selectedType, minRating);
  }, [searchQuery, selectedCity, selectedType, minRating]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCity('');
    setSelectedType('');
    setMinRating('');
    setShowFilters(false);
  };

  const displayVenues = searchResults?.venues || venues.length > 0 ? venues : popularVenues;

  const renderVenue = ({ item }: { item: Venue }) => (
    <VenueCard
      venue={item}
      onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
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
          <Text style={styles.modalTitle}>Filter Venues</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {/* City Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>City</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Enter city name"
              value={selectedCity}
              onChangeText={setSelectedCity}
            />
          </View>

          {/* Venue Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Venue Type</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[styles.typeButton, !selectedType && styles.typeButtonSelected]}
                onPress={() => setSelectedType('')}
              >
                <Text style={[styles.typeButtonText, !selectedType && styles.typeButtonTextSelected]}>
                  All Types
                </Text>
              </TouchableOpacity>
              {VENUE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeButton, selectedType === type.value && styles.typeButtonSelected]}
                  onPress={() => setSelectedType(type.value as VenueType)}
                >
                  <Text style={[styles.typeButtonText, selectedType === type.value && styles.typeButtonTextSelected]}>
                    {type.label}
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
        </View>
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
            placeholder="Search venues..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(selectedCity || selectedType || minRating) && (
        <View style={styles.activeFilters}>
          {selectedCity && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>📍 {selectedCity}</Text>
              <TouchableOpacity onPress={() => setSelectedCity('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>
          )}
          {selectedType && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>
                🏛️ {VENUE_TYPES.find(t => t.value === selectedType)?.label}
              </Text>
              <TouchableOpacity onPress={() => setSelectedType('')}>
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
        data={displayVenues}
        renderItem={renderVenue}
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
  filterInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    paddingHorizontal: SPACING.base,
    height: 50,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 20,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  typeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  typeButtonTextSelected: {
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

export default VenuesScreen;