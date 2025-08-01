import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import authSlice from './slices/authSlice';
import venuesSlice from './slices/venuesSlice';
import bandsSlice from './slices/bandsSlice';
import reviewsSlice from './slices/reviewsSlice';
import badgesSlice from './slices/badgesSlice';
import { RootState } from '../types';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    venues: venuesSlice,
    bands: bandsSlice,
    reviews: reviewsSlice,
    badges: badgesSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;

// Use these hooks instead of plain useDispatch and useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;