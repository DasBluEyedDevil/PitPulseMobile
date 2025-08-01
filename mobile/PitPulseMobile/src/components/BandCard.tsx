import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Band } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants';
import { getRatingColor, getStarIcons } from '../utils';

interface Props {
  band: Band;
  onPress: () => void;
}

const BandCard: React.FC<Props> = ({ band, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        {band.imageUrl ? (
          <Image source={{ uri: band.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="musical-notes" size={32} color={COLORS.gray500} />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {band.name}
        </Text>
        
        {band.genre && (
          <Text style={styles.genre} numberOfLines={1}>
            {band.genre}
          </Text>
        )}
        
        {band.hometown && (
          <Text style={styles.hometown} numberOfLines={1}>
            📍 {band.hometown}
          </Text>
        )}
        
        {band.formedYear && (
          <Text style={styles.year}>
            Formed {band.formedYear}
          </Text>
        )}
        
        <View style={styles.ratingContainer}>
          <View style={styles.stars}>
            {getStarIcons(band.averageRating).map((icon, index) => (
              <Ionicons
                key={index}
                name={icon}
                size={16}
                color={getRatingColor(band.averageRating)}
              />
            ))}
          </View>
          <Text style={styles.ratingText}>
            {band.averageRating.toFixed(1)} ({band.totalReviews})
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
  genre: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: SPACING.xs,
  },
  hometown: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  year: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
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

export default BandCard;