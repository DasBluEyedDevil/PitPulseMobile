import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { createReview, updateReview, fetchReviewById } from '../../store/slices/reviewsSlice';
import { fetchVenueById } from '../../store/slices/venuesSlice';
import { fetchBandById } from '../../store/slices/bandsSlice';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, RATING_CONFIG } from '../../constants';

type CreateReviewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateReview'>;
type CreateReviewScreenRouteProp = RouteProp<RootStackParamList, 'CreateReview'>;

interface Props {
  navigation: CreateReviewScreenNavigationProp;
  route: CreateReviewScreenRouteProp;
}

const CreateReviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { venueId, bandId, reviewId } = route.params;
  const dispatch = useAppDispatch();
  const { currentVenue } = useAppSelector((state) => state.venues);
  const { currentBand } = useAppSelector((state) => state.bands);
  const { currentReview, isLoading } = useAppSelector((state) => state.reviews);
  
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    content: '',
    eventDate: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!reviewId;
  const target = currentVenue || currentBand;
  const targetType = venueId ? 'venue' : 'band';

  useEffect(() => {
    loadData();
  }, [dispatch, venueId, bandId, reviewId]);

  const loadData = async () => {
    try {
      // Load target (venue or band)
      if (venueId) {
        await dispatch(fetchVenueById(venueId));
      } else if (bandId) {
        await dispatch(fetchBandById(bandId));
      }

      // Load existing review if editing
      if (reviewId) {
        const result = await dispatch(fetchReviewById(reviewId));
        const review = result.payload as any;
        if (review) {
          setFormData({
            rating: review.rating,
            title: review.title || '',
            content: review.content || '',
            eventDate: review.eventDate ? review.eventDate.split('T')[0] : '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (formData.rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (formData.content.length > 1000) {
      newErrors.content = 'Review must be 1000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const reviewData = {
        venueId: venueId || undefined,
        bandId: bandId || undefined,
        rating: formData.rating,
        title: formData.title.trim() || undefined,
        content: formData.content.trim() || undefined,
        eventDate: formData.eventDate || undefined,
      };

      if (isEditing && reviewId) {
        await dispatch(updateReview({ reviewId, reviewData }));
        Alert.alert('Success', 'Review updated successfully!');
      } else {
        await dispatch(createReview(reviewData));
        Alert.alert('Success', 'Review posted successfully!');
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderStarRating = () => {
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>Rating *</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleInputChange('rating', star)}
              style={styles.starButton}
            >
              <Ionicons
                name={star <= formData.rating ? 'star' : 'star-outline'}
                size={32}
                color={star <= formData.rating ? COLORS.rating4 : COLORS.gray400}
              />
            </TouchableOpacity>
          ))}
        </View>
        {formData.rating > 0 && (
          <Text style={styles.ratingText}>
            {RATING_CONFIG.labels[formData.rating as keyof typeof RATING_CONFIG.labels]}
          </Text>
        )}
        {errors.rating && <Text style={styles.errorText}>{errors.rating}</Text>}
      </View>
    );
  };

  if (!target) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Review' : 'Write Review'}
          </Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update' : 'Post'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Target Info */}
          <View style={styles.targetSection}>
            <Text style={styles.targetLabel}>
              Reviewing {targetType === 'venue' ? 'Venue' : 'Band'}
            </Text>
            <Text style={styles.targetName}>{target.name}</Text>
            {target.city && <Text style={styles.targetDetails}>{target.city}</Text>}
            {(target as any).genre && <Text style={styles.targetDetails}>{(target as any).genre}</Text>}
          </View>

          <View style={styles.formSection}>
            {/* Rating */}
            {renderStarRating()}

            {/* Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={[styles.textInput, errors.title && styles.inputError]}
                placeholder="Give your review a title"
                placeholderTextColor={COLORS.gray500}
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
                maxLength={100}
              />
              <Text style={styles.characterCount}>
                {formData.title.length}/100
              </Text>
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            {/* Content */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Review</Text>
              <TextInput
                style={[styles.textArea, errors.content && styles.inputError]}
                placeholder="Share your experience... What did you like? What could be better?"
                placeholderTextColor={COLORS.gray500}
                value={formData.content}
                onChangeText={(value) => handleInputChange('content', value)}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.characterCount}>
                {formData.content.length}/1000
              </Text>
              {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}
            </View>

            {/* Event Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Event Date (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.gray500}
                value={formData.eventDate}
                onChangeText={(value) => handleInputChange('eventDate', value)}
              />
              <Text style={styles.helperText}>
                When did you visit this {targetType}?
              </Text>
            </View>

            {/* Guidelines */}
            <View style={styles.guidelinesSection}>
              <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
              <Text style={styles.guidelinesText}>
                • Be honest and constructive in your feedback{'\n'}
                • Focus on your personal experience{'\n'}
                • Avoid inappropriate language or personal attacks{'\n'}
                • Include specific details about your visit{'\n'}
                • Help other music lovers make informed decisions
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  submitButton: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  targetSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  targetLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  targetName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  targetDetails: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  formSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
  },
  ratingContainer: {
    marginBottom: SPACING.lg,
  },
  ratingLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  starButton: {
    padding: SPACING.xs,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.base,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textArea: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.base,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 120,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  characterCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  helperText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  guidelinesSection: {
    backgroundColor: COLORS.gray100,
    padding: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
    marginTop: SPACING.base,
  },
  guidelinesTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  guidelinesText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.base,
  },
});

export default CreateReviewScreen;