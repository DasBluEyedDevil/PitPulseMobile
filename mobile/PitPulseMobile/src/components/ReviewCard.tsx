import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants';
import { formatRelativeTime, getRatingColor, getInitials, truncateText } from '../utils';

interface Props {
  review: Review;
  onPress: () => void;
  onUserPress?: () => void;
  onHelpfulPress?: (isHelpful: boolean) => void;
  showHelpfulButtons?: boolean;
}

const ReviewCard: React.FC<Props> = ({ 
  review, 
  onPress, 
  onUserPress, 
  onHelpfulPress, 
  showHelpfulButtons = false 
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userSection} 
          onPress={onUserPress}
          disabled={!onUserPress}
        >
          <View style={styles.avatar}>
            {review.user?.profileImageUrl ? (
              <Image 
                source={{ uri: review.user.profileImageUrl }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Text style={styles.avatarText}>
                {getInitials(review.user?.firstName, review.user?.lastName)}
              </Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <View style={styles.usernameContainer}>
              <Text style={styles.username}>
                {review.user?.username || 'Anonymous'}
              </Text>
              {review.user?.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
              )}
            </View>
            <Text style={styles.timestamp}>
              {formatRelativeTime(review.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Rating */}
        <View style={styles.ratingContainer}>
          {[...Array(5)].map((_, i) => (
            <Ionicons
              key={i}
              name={i < review.rating ? 'star' : 'star-outline'}
              size={16}
              color={getRatingColor(review.rating)}
            />
          ))}
        </View>
      </View>

      {/* Target (Venue or Band) */}
      <View style={styles.targetContainer}>
        <Text style={styles.targetText}>
          {review.venue && `🏛️ ${review.venue.name}`}
          {review.band && `🎵 ${review.band.name}`}
        </Text>
        {review.eventDate && (
          <Text style={styles.eventDate}>
            📅 {new Date(review.eventDate).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Content */}
      {review.title && (
        <Text style={styles.title} numberOfLines={2}>
          {review.title}
        </Text>
      )}
      
      {review.content && (
        <Text style={styles.content} numberOfLines={3}>
          {truncateText(review.content, 150)}
        </Text>
      )}

      {/* Images */}
      {review.imageUrls && review.imageUrls.length > 0 && (
        <View style={styles.imagesContainer}>
          {review.imageUrls.slice(0, 3).map((imageUrl, index) => (
            <Image key={index} source={{ uri: imageUrl }} style={styles.reviewImage} />
          ))}
          {review.imageUrls.length > 3 && (
            <View style={styles.moreImages}>
              <Text style={styles.moreImagesText}>+{review.imageUrls.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.helpfulContainer}>
          <Ionicons name="thumbs-up-outline" size={16} color={COLORS.gray500} />
          <Text style={styles.helpfulText}>
            {review.helpfulCount} helpful
          </Text>
        </View>

        {showHelpfulButtons && onHelpfulPress && (
          <View style={styles.helpfulButtons}>
            <TouchableOpacity
              style={styles.helpfulButton}
              onPress={() => onHelpfulPress(true)}
            >
              <Ionicons name="thumbs-up-outline" size={16} color={COLORS.primary} />
              <Text style={styles.helpfulButtonText}>Helpful</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpfulButton}
              onPress={() => onHelpfulPress(false)}
            >
              <Ionicons name="thumbs-down-outline" size={16} color={COLORS.gray500} />
              <Text style={styles.helpfulButtonText}>Not helpful</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.base,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: SPACING.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  userSection: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
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
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  targetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  targetText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary,
  },
  eventDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  content: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.xs,
  },
  moreImages: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpfulContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  helpfulButtons: {
    flexDirection: 'row',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  helpfulButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
});

export default ReviewCard;