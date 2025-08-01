import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants';

export default function App() {
  return (
    <Provider store={store}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <AppNavigator />
    </Provider>
  );
}