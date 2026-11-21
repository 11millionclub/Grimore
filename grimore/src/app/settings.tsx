import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { Toggle } from '@/components/switch';
import {
  BooksIcon,
  CaretRightIcon,
  CreditCardIcon,
  CrownSimpleIcon,
  DownloadSimpleIcon,
  EyeSlashIcon,
  GlobeIcon,
  HandshakeIcon,
  SignOutIcon,
  TrophyIcon,
  UsersThreeIcon,
} from '@/components/icons';
import { Avatar, Group, Press, Row, Screen, Text, toast } from '@/components/ui';
import { useMyId, useMyProfile, usePreferences, useReadingGoal } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { signOut } from '@/services/auth';
import { updatePreferences, updateProfile } from '@/services/profile';
import { radius, spacing, useTheme } from '@/theme';

const NOTIFS: [string, string][] = [
  ['games', 'Daily games'],
  ['follows', 'New followers'],
  ['comments', 'Comments and likes'],
  ['communities', 'Communities'],
  ['market', 'Market and trades'],
  ['messages', 'Messages'],
];

export default function Settings() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const profile = useMyProfile();
  const prefs = usePreferences();
  const goal = useReadingGoal(me);
  const settings = (prefs.data?.notification_settings ?? {}) as Record<string, boolean>;
  const setNotif = useMutation({
    mutationFn: (patch: Record<string, boolean>) => updatePreferences(me, { notification_settings: { ...settings, ...patch } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.preferences }),
    onError: (e) => toast(toAppError(e).message),
  });
  const setPrivate = useMutation({
    mutationFn: (v: boolean) => updateProfile(me, { is_private: v }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.profile(me) }),
  });
  const setSpoilers = useMutation({
    mutationFn: (v: boolean) => updatePreferences(me, { show_spoilers: v }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.preferences }),
  });
  const icon = (I: typeof BooksIcon) => <I size={20} color={colors.muted} />;
  const chevron = <CaretRightIcon size={15} color={colors.faint} />;
  const soon = () => toast('Payments are coming soon');

  return (
    <Screen title="Settings" back>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Press onPress={() => router.push('/profile/edit')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <Avatar uri={profile.data?.avatar_url} name={profile.data?.display_name} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="title">{profile.data?.display_name ?? profile.data?.username}</Text>
            <Text variant="small" tone="muted">
              Edit profile
            </Text>
          </View>
          {chevron}
        </Press>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        <Press onPress={() => router.push('/corner/edit')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <CrownSimpleIcon size={22} weight="fill" color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Corner shop</Text>
            <Text variant="small" tone="muted">
              Themes, frames and stickers. One-off purchases.
            </Text>
          </View>
          {chevron}
        </Press>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, paddingHorizontal: spacing.xs }}>
          Grimore is free with every feature for everyone. Paid communities and a small market fee will keep it running once payments open.
        </Text>
      </View>

      <Group title="Reading">
        <Row icon={icon(TrophyIcon)} label="Yearly goal" value={goal.data?.target ? `${goal.data.target} books` : 'Not set'} onPress={() => router.push('/goals')} right={chevron} />
        <Row icon={icon(BooksIcon)} label="Shelves" onPress={() => router.push('/me')} right={chevron} />
        <Row icon={icon(DownloadSimpleIcon)} label="Import library" value="Kindle, Kobo, Goodreads" onPress={() => router.push('/import')} right={chevron} last />
      </Group>


      <Group title="Notifications">
        {NOTIFS.map(([k, label], i) => (
          <Row key={k} label={label} last={i === NOTIFS.length - 1} right={<Toggle value={settings[k] !== false} onChange={(v) => setNotif.mutate({ [k]: v })} label={label} />} />
        ))}
      </Group>

      <Group title="Privacy">
        <Row icon={icon(GlobeIcon)} label="Private profile" right={<Toggle value={!!profile.data?.is_private} onChange={(v) => setPrivate.mutate(v)} label="Private profile" />} />
        <Row icon={icon(EyeSlashIcon)} label="Show spoilers without asking" right={<Toggle value={!!prefs.data?.show_spoilers} onChange={(v) => setSpoilers.mutate(v)} label="Show spoilers" />} last />
      </Group>

      <Group title="Payments">
        <Row icon={icon(CreditCardIcon)} label="Payment methods" value="Coming soon" onPress={soon} />
        <Row icon={icon(HandshakeIcon)} label="Sales and trades" onPress={() => router.push({ pathname: '/explore' })} right={chevron} />
        <Row icon={icon(UsersThreeIcon)} label="Community memberships" value="Coming soon" onPress={soon} />
        <Row icon={icon(CrownSimpleIcon)} label="Corner purchases" onPress={() => router.push('/corner/edit')} right={chevron} last />
      </Group>

      <Group>
        <Row
          icon={<SignOutIcon size={20} color={colors.danger} />}
          label="Sign out"
          danger
          last
          onPress={() =>
            Alert.alert('Sign out?', undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => signOut().then(() => qc.clear(), (e) => toast(toAppError(e).message)) },
            ])
          }
        />
      </Group>
      <Text variant="caption" tone="faint" align="center" style={{ marginTop: spacing.xl }}>
        Grimore
      </Text>
    </Screen>
  );
}
