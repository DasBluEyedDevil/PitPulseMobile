import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, RootStackParamList } from '../types';
import { COLORS, SCREEN_NAMES } from '../constants';

// Tab Screens
import HomeScreen from '../screens/main/HomeScreen';
import VenuesScreen from '../screens/main/VenuesScreen';
import BandsScreen from '../screens/main/BandsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Detail Screens
import VenueDetailScreen from '../screens/details/VenueDetailScreen';
import BandDetailScreen from '../screens/details/BandDetailScreen';
import ReviewDetailScreen from '../screens/details/ReviewDetailScreen';
import CreateReviewScreen from '../screens/forms/CreateReviewScreen';
import EditProfileScreen from '../screens/forms/EditProfileScreen';
import UserProfileScreen from '../screens/details/UserProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case SCREEN_NAMES.HOME:
              iconName = focused ? 'home' : 'home-outline';
              break;
            case SCREEN_NAMES.VENUES:
              iconName = focused ? 'business' : 'business-outline';
              break;
            case SCREEN_NAMES.BANDS:
              iconName = focused ? 'musical-notes' : 'musical-notes-outline';
              break;
            case SCREEN_NAMES.PROFILE:
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.gray200,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name={SCREEN_NAMES.HOME} 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name={SCREEN_NAMES.VENUES} 
        component={VenuesScreen}
        options={{ title: 'Venues' }}
      />
      <Tab.Screen 
        name={SCREEN_NAMES.BANDS} 
        component={BandsScreen}
        options={{ title: 'Bands' }}
      />
      <Tab.Screen 
        name={SCREEN_NAMES.PROFILE} 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.VENUE_DETAIL} 
        component={VenueDetailScreen}
        options={{ title: 'Venue Details' }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.BAND_DETAIL} 
        component={BandDetailScreen}
        options={{ title: 'Band Details' }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.REVIEW_DETAIL} 
        component={ReviewDetailScreen}
        options={{ title: 'Review Details' }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.CREATE_REVIEW} 
        component={CreateReviewScreen}
        options={{ title: 'Write Review' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={UserProfileScreen}
        options={{ title: 'User Profile' }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.EDIT_PROFILE} 
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;