import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

import { env } from './env';

const isServer = typeof window === 'undefined';

export const supabase = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    // During static web rendering there is no storage; keep sessions in memory.
    storage: Platform.OS === 'web' && isServer ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: !(Platform.OS === 'web' && isServer),
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Only refresh tokens while the app is in the foreground (Supabase guidance for React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
