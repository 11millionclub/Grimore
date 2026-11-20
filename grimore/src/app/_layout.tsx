import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import { GeistMono_500Medium, GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text, ToastHost } from '@/components/ui';
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
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>{fontsLoaded || fontError ? <Navigation /> : null}</QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const sheet: NativeStackNavigationOptions = { presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: false, sheetCornerRadius: 28 };
const fullscreen: NativeStackNavigationOptions = { presentation: 'fullScreenModal', animation: 'slide_from_bottom' };

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
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.bg);
  }, [theme.colors.bg]);

  // Magic-link, password-recovery and email-confirmation links.
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (url && url.includes('access_token')) {
      consumeAuthLink(url).then(
        (type) => {
          if (type === 'recovery') useSessionStore.getState().setRecovering(true);
        },
        () => undefined,
      );
    }
  }, [url]);

  if (envError) return <ConfigError message={envError} />;
  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg }, animation: 'default' }}>
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
          <Stack.Screen name="add" options={sheet} />
          <Stack.Screen name="search" options={sheet} />
          <Stack.Screen name="progress/[bookId]" options={sheet} />
          <Stack.Screen name="sell" options={sheet} />
          <Stack.Screen name="trade/[id]" options={sheet} />
          <Stack.Screen name="community/join/[id]" options={sheet} />
          <Stack.Screen name="shelves/new" options={sheet} />
          <Stack.Screen name="scan" options={fullscreen} />
          <Stack.Screen name="game/[id]" options={{ ...fullscreen, gestureEnabled: false }} />
          <Stack.Screen name="wrapped" options={fullscreen} />
          <Stack.Screen name="corner/edit" options={fullscreen} />
          <Stack.Screen name="community/new" options={fullscreen} />
          <Stack.Screen name="quiz" options={fullscreen} />
          <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
          <Stack.Screen name="review/[bookId]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="thread/new/[communityId]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="import" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile/edit" />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="book/[id]" />
          <Stack.Screen name="reviews/[bookId]" />
          <Stack.Screen name="author/[name]" />
          <Stack.Screen name="user/[username]" />
          <Stack.Screen name="follows/[userId]" />
          <Stack.Screen name="community/[id]" />
          <Stack.Screen name="thread/[id]" />
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen name="checkout/[id]" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="dna" />
          <Stack.Screen name="shelf/[id]" />
          <Stack.Screen name="achievements" />
          <Stack.Screen name="goals" />
          <Stack.Screen name="settings" />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </>
  );
}

function ConfigError({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xxl, gap: spacing.md }}>
      <Text variant="h1">Almost there</Text>
      <Text variant="body" tone="muted">
        {message}
      </Text>
    </View>
  );
}
