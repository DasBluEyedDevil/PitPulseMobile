import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import { COLORS, TYPOGRAPHY, SPACING, APP_INFO } from '../../constants';

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🎵</Text>
          </View>
          <Text style={styles.appName}>{APP_INFO.name}</Text>
          <Text style={styles.tagline}>{APP_INFO.description}</Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🏛️</Text>
            <Text style={styles.featureText}>Discover amazing venues</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎸</Text>
            <Text style={styles.featureText}>Explore talented bands</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>⭐</Text>
            <Text style={styles.featureText}>Share your reviews</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🏆</Text>
            <Text style={styles.featureText}>Earn badges</Text>
          </View>
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: SPACING.xxxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoText: {
    fontSize: 60,
  },
  appName: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    marginVertical: SPACING.xl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.base,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: SPACING.base,
    width: 32,
  },
  featureText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    flex: 1,
  },
  buttonsSection: {
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.base,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.base,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default WelcomeScreen;