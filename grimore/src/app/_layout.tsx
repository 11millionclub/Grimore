import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
} from '@expo-google-fonts/newsreader';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useMyProfile } from '@/hooks/queries';
import { envError } from '@/lib/env';
import { queryClient } from '@/lib/query-client';
import { consumeAuthLink } from '@/services/auth';
import { startSessionListener, useSessionStore } from '@/stores/session';
import { ThemeProvider, spacing, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();
startSessionListener();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            {fontsLoaded || fontError ? <Navigation /> : null}
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigation() {
  const theme = useTheme();
  const session = useSessionStore((s) => s.session);
  const ready = useSessionStore((s) => s.ready);
  const recovering = useSessionStore((s) => s.recovering);
  const profile = useMyProfile();

  const signedIn = !!session;
  const profileReady = !signedIn || profile.isSuccess || profile.isError;
  const onboarded = !!profile.data?.onboarding_completed_at;
  const loaded = ready && profileReady;

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  // Password-recovery and email-confirmation links.
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (url && url.includes('access_token')) {
      consumeAuthLink(url).then((type) => {
        if (type === 'recovery') useSessionStore.getState().setRecovering(true);
      }, () => undefined);
    }
  }, [url]);

  if (envError) return <ConfigError message={envError} />;
  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.colors.canvas }} />;

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.canvas },
          animation: 'default',
        }}
      >
        <Stack.Protected guard={recovering}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>

        <Stack.Protected guard={!signedIn && !recovering}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !onboarded && !recovering}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && onboarded && !recovering}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="book/[id]" />
          <Stack.Screen name="add-book" options={{ presentation: 'modal' }} />
          <Stack.Screen name="add-book-manual" options={{ presentation: 'modal' }} />
          <Stack.Screen name="review/[bookId]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
          <Stack.Screen name="item/[type]/[id]" />
          <Stack.Screen name="user/[username]" />
          <Stack.Screen name="play/bookle" />
          <Stack.Screen name="play/cover-reveal" />
          <Stack.Screen name="play/quiz" />
          <Stack.Screen name="play/streak" />
          <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="corner/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="find-readers" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function ConfigError({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', padding: spacing.xxl, gap: spacing.md }}>
      <Text variant="title2">Almost there</Text>
      <Text variant="body" tone="muted">
        {message}
      </Text>
    </View>
  );
}
