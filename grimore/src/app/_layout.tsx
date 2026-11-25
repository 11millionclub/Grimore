import { CormorantGaramond_500Medium_Italic, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import { GeistMono_500Medium, GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
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

import { MessageAlerts } from '@/components/app-actions';
import { Text, ToastHost, toast } from '@/components/ui';
import { useMyHouse, useMyProfile, usePreferences } from '@/hooks/queries';
import { envError } from '@/lib/env';
import { toAppError } from '@/lib/errors';
import { queryClient } from '@/lib/query-client';
import { getMaintenance } from '@/services/app-config';
import { consumeAuthLink } from '@/services/auth';
import { pendingInvite, redeemInvite } from '@/services/invites';
import { startSessionListener, useSessionStore } from '@/stores/session';
import { ThemeProvider, appTheme, spacing, useAppTheme, useTheme } from '@/theme';

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
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
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

const sheet: NativeStackNavigationOptions = { presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: false, sheetCornerRadius: 18 };
const fullscreen: NativeStackNavigationOptions = { presentation: 'fullScreenModal', animation: 'slide_from_bottom' };

function Navigation() {
  const theme = useTheme();
  const session = useSessionStore((s) => s.session);
  const ready = useSessionStore((s) => s.ready);
  const recovering = useSessionStore((s) => s.recovering);
  const profile = useMyProfile();
  // Kill switch: checked on launch, every minute and when the app comes back to the front.
  const maintenance = useQuery({ queryKey: ['maintenance'], queryFn: getMaintenance, refetchInterval: 60_000, staleTime: 30_000 });
  const myHouse = useMyHouse();
  // The account's app theme wins when it loads (e.g. on a new device).
  const prefs = usePreferences();
  const setAppTheme = useAppTheme((s) => s.set);
  const savedTheme = prefs.data?.app_theme;
  useEffect(() => {
    if (savedTheme) setAppTheme(appTheme(savedTheme).id);
  }, [savedTheme, setAppTheme]);

  const signedIn = !!session;
  const profileReady = !signedIn || profile.isSuccess || profile.isError;
  const onboarded = !!profile.data?.onboarding_completed_at;
  // Readers who joined before Houses existed are sorted the next time they open the app.
  const houseReady = !signedIn || !onboarded || myHouse.isSuccess || myHouse.isError;
  const needsHouse = signedIn && onboarded && myHouse.isSuccess && !myHouse.data.house;
  const loaded = ready && profileReady && houseReady;

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
  if (maintenance.data?.on) return <MaintenanceScreen message={maintenance.data.message} />;
  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg }, animation: 'default' }}>
        <Stack.Protected guard={recovering}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>

        {/* Invite links work signed in or out: the code is kept and redeemed after sign-up. */}
        <Stack.Screen name="invite/[code]" />

        <Stack.Protected guard={!signedIn && !recovering}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !onboarded && !recovering}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>

        <Stack.Protected guard={needsHouse && !recovering}>
          <Stack.Screen name="sorting" options={{ gestureEnabled: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && onboarded && !needsHouse && !recovering}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add" options={sheet} />
          <Stack.Screen name="search" options={sheet} />
          <Stack.Screen name="progress/[bookId]" options={sheet} />
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
          <Stack.Screen name="community/manage/[id]" />
          <Stack.Screen name="community/members/[id]" />
          <Stack.Screen name="thread/[id]" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="dna" />
          <Stack.Screen name="shelf/[id]" />
          <Stack.Screen name="achievements" />
          <Stack.Screen name="goals" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="house" />
          <Stack.Screen name="house-cup" />
          <Stack.Screen name="points" />
          <Stack.Screen name="app-theme" />
          <Stack.Screen name="avatar" />
          <Stack.Screen name="reading-session" />
          <Stack.Screen name="wheel" />
          <Stack.Screen name="common-room/[house]" />
          <Stack.Screen name="invite" />
        </Stack.Protected>
      </Stack>
      {signedIn && onboarded && !needsHouse ? <MessageAlerts /> : null}
      {signedIn && onboarded && !needsHouse ? <InviteRedeemer /> : null}
      <ToastHost />
    </>
  );
}

/** Redeems an invite code saved from a link opened before the reader had an account. */
function InviteRedeemer() {
  useEffect(() => {
    let cancelled = false;
    void pendingInvite.get().then(async (code) => {
      if (!code || cancelled) return;
      await pendingInvite.clear();
      try {
        const r = await redeemInvite(code);
        void queryClient.invalidateQueries({ queryKey: ['wallet'] });
        toast(`Invite accepted: +${r.points} points`);
      } catch (e) {
        toast(toAppError(e).message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

function MaintenanceScreen({ message }: { message: string | null }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md }}>
      <Text variant="h1" align="center">
        Back soon
      </Text>
      <Text variant="body" tone="muted" align="center">
        {message ?? 'Grimore is getting a quick polish. Please try again in a little while.'}
      </Text>
    </View>
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
