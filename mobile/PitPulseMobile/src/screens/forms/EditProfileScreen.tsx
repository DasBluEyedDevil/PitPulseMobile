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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateProfile } from '../../store/slices/authSlice';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants';
import { getInitials } from '../../utils';

type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;

interface Props {
  navigation: EditProfileScreenNavigationProp;
}

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    dateOfBirth: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        location: user.location || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length > 50) {
      newErrors.firstName = 'First name must be 50 characters or less';
    }

    if (formData.lastName.length > 50) {
      newErrors.lastName = 'Last name must be 50 characters or less';
    }

    if (formData.bio.length > 500) {
      newErrors.bio = 'Bio must be 500 characters or less';
    }

    if (formData.location.length > 100) {
      newErrors.location = 'Location must be 100 characters or less';
    }

    // Basic date validation
    if (formData.dateOfBirth) {
      const date = new Date(formData.dateOfBirth);
      const today = new Date();
      const minDate = new Date(today.getFullYear() - 120, 0, 1);
      const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
      
      if (isNaN(date.getTime())) {
        newErrors.dateOfBirth = 'Please enter a valid date';
      } else if (date < minDate || date > maxDate) {
        newErrors.dateOfBirth = 'Please enter a valid birth date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        location: formData.location.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
      };

      await dispatch(updateProfile(updateData));
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Photo Section */}
          <View style={styles.photoSection}>
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
            </View>
            <TouchableOpacity style={styles.changePhotoButton}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
            <Text style={styles.photoHelperText}>
              Photo changes coming in a future update
            </Text>
          </View>

          <View style={styles.formSection}>
            {/* Username (Read-only) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>@{user.username}</Text>
              </View>
              <Text style={styles.helperText}>
                Username cannot be changed
              </Text>
            </View>

            {/* Email (Read-only) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{user.email}</Text>
              </View>
              <Text style={styles.helperText}>
                Email cannot be changed
              </Text>
            </View>

            {/* First Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.textInput, errors.firstName && styles.inputError]}
                placeholder="Enter your first name"
                placeholderTextColor={COLORS.gray500}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                maxLength={50}
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            {/* Last Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.textInput, errors.lastName && styles.inputError]}
                placeholder="Enter your last name"
                placeholderTextColor={COLORS.gray500}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                maxLength={50}
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>

            {/* Bio */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.textArea, errors.bio && styles.inputError]}
                placeholder="Tell other music lovers about yourself..."
                placeholderTextColor={COLORS.gray500}
                value={formData.bio}
                onChangeText={(value) => handleInputChange('bio', value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {formData.bio.length}/500
              </Text>
              {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
            </View>

            {/* Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={[styles.textInput, errors.location && styles.inputError]}
                placeholder="City, State/Country"
                placeholderTextColor={COLORS.gray500}
                value={formData.location}
                onChangeText={(value) => handleInputChange('location', value)}
                maxLength={100}
              />
              <Text style={styles.helperText}>
                Where are you based? This helps others find local reviewers.
              </Text>
              {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
            </View>

            {/* Date of Birth */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={[styles.textInput, errors.dateOfBirth && styles.inputError]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.gray500}
                value={formData.dateOfBirth}
                onChangeText={(value) => handleInputChange('dateOfBirth', value)}
              />
              <Text style={styles.helperText}>
                Your age won't be shown publicly. Must be 13 or older to use PitPulse.
              </Text>
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            </View>

            {/* Privacy Notice */}
            <View style={styles.privacySection}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
              <Text style={styles.privacyText}>
                Your email and date of birth are private and won't be shown to other users.
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
  saveButton: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.base,
  },
  avatarContainer: {
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
  changePhotoButton: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  changePhotoText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  photoHelperText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
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
    minHeight: 100,
  },
  readOnlyInput: {
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.base,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
  },
  readOnlyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
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
  privacySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.gray100,
    padding: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
    marginTop: SPACING.lg,
  },
  privacyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    flex: 1,
    lineHeight: 18,
  },
});

export default EditProfileScreen;