import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Venue } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants';
import { getRatingColor, getStarIcons } from '../utils';

interface Props {
  venue: Venue;
  onPress: () => void;
}

const VenueCard: React.FC<Props> = ({ venue, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        {venue.imageUrl ? (
          <Image source={{ uri: venue.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="business" size={32} color={COLORS.gray500} />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {venue.name}
        </Text>
        
        <Text style={styles.location} numberOfLines={1}>
          {venue.address && `${venue.address}, `}
          {venue.city}{venue.state && `, ${venue.state}`}
        </Text>
        
        {venue.venueType && (
          <Text style={styles.type}>
            {venue.venueType.replace('_', ' ').toUpperCase()}
          </Text>
        )}
        
        <View style={styles.ratingContainer}>
          <View style={styles.stars}>
            {getStarIcons(venue.averageRating).map((icon, index) => (
              <Ionicons
                key={index}
                name={icon}
                size={16}
                color={getRatingColor(venue.averageRating)}
              />
            ))}
          </View>
          <Text style={styles.ratingText}>
            {venue.averageRating.toFixed(1)} ({venue.totalReviews})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: SPACING.base,
  },
  imageContainer: {
    height: 120,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING.base,
  },
  name: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  location: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  type: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: SPACING.xs,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
});

export default VenueCard;