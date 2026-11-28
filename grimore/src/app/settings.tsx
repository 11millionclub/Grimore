import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Toggle } from '@/components/switch';
import {
  BooksIcon,
  CaretRightIcon,
  CreditCardIcon,
  CrownSimpleIcon,
  DownloadSimpleIcon,
  EyeSlashIcon,
  GlobeIcon,
  SignOutIcon,
  TrophyIcon,
  UsersThreeIcon, GiftIcon, EnvelopeSimpleIcon, FileArrowDownIcon, PaletteIcon, TrashIcon } from '@/components/icons';
import { Avatar, Group, Press, Row, Screen, Text, toast } from '@/components/ui';
import { Sigil } from '@/components/sigil';
import { useMyHouse, useMyId, useMyProfile, usePreferences, useReadingGoal } from '@/hooks/queries';
import { clearHouseCache } from '@/hooks/use-house-of';
import { useTranslation } from '@/i18n';
import { track } from '@/lib/analytics';
import { setHouseHidden } from '@/services/houses';
import { HOUSE_NAMES, houseInk } from '@/theme/houses';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { signOut } from '@/services/auth';
import { confirmAction } from '@/lib/confirm';
import { exportMyData } from '@/services/export';
import { deleteMyAccount, updatePreferences, updateProfile } from '@/services/profile';
import { appTheme, radius, spacing, useTheme } from '@/theme';

const NOTIFS: [string, string][] = [
  ['games', 'Daily games'],
  ['follows', 'New followers'],
  ['comments', 'Comments and likes'],
  ['communities', 'Communities'],
  ['messages', 'Messages'],
];

export default function Settings() {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const me = useMyId()!;
  const qc = useQueryClient();
  const profile = useMyProfile();
  const prefs = usePreferences();
  const goal = useReadingGoal(me);
  const myHouse = useMyHouse();
  const { t } = useTranslation();
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
  const setNewsletter = useMutation({
    mutationFn: (v: boolean) => updatePreferences(me, { newsletter_opt_in: v }),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.preferences });
      toast(v ? 'Subscribed to the newsletter' : 'Unsubscribed from the newsletter');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const deleteAccount = async () => {
    if (!(await confirmAction('Delete your account?', 'Your library, reviews, posts, messages, points, Grimore items and communities you host are deleted for good. This cannot be undone.', 'Continue'))) return;
    if (!(await confirmAction('Are you absolutely sure?', 'Your account and everything in it will be gone forever.', 'Delete forever'))) return;
    try {
      await deleteMyAccount(me);
      qc.clear();
    } catch (e) {
      toast(toAppError(e).message);
    }
  };
  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportMyData();
      toast('Your data is ready');
    } catch (e) {
      toast(toAppError(e).message);
    } finally {
      setExporting(false);
    }
  };
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
            <Text variant="bodyStrong">My Grimore shop</Text>
            <Text variant="small" tone="muted">
              Themes, frames and stickers. One-off purchases.
            </Text>
          </View>
          {chevron}
        </Press>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, paddingHorizontal: spacing.xs }}>
          Grimore is free with every feature for everyone. Paid communities and optional My Grimore cosmetics will keep it running once payments open.
        </Text>
      </View>

      {myHouse.data?.house ? (
        <Group title={t('settings.house')}>
          <Row
            icon={<Sigil house={myHouse.data.house} size={20} color={houseInk(myHouse.data.house, dark)} label={false} />}
            label={HOUSE_NAMES[myHouse.data.house]}
            onPress={() => router.push('/house')}
            right={chevron}
          />
          <Row
            label={t('house.hide')}
            right={
              <Toggle
                value={myHouse.data.hidden}
                onChange={(v) =>
                  void setHouseHidden(me, v).then(
                    () => {
                      track('house_hidden_toggled', { hidden: v });
                      void qc.invalidateQueries({ queryKey: ['myHouse'] });
                      void qc.invalidateQueries({ queryKey: ['readerHouses'] });
      clearHouseCache();
                    },
                    (e) => toast(toAppError(e).message),
                  )
                }
                label={t('house.hide')}
              />
            }
          />
          <Row label={t('cup.title')} onPress={() => router.push('/house-cup')} right={chevron} />
          <Row label="My points & rewards" onPress={() => router.push('/points')} right={chevron} last />
        </Group>
      ) : null}

      <Group title="Friends">
        <Row icon={icon(GiftIcon)} label="Invite friends" value="Points for both of you" onPress={() => router.push('/invite')} right={chevron} last />
      </Group>

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

      <Group title="Appearance">
        <Row icon={icon(PaletteIcon)} label="App theme" value={appTheme(prefs.data?.app_theme).name} onPress={() => router.push('/app-theme')} right={chevron} last />
      </Group>

      <Group title="Newsletter">
        <Row icon={icon(EnvelopeSimpleIcon)} label="Grimore newsletter" value="News, reading picks and events by email" right={<Toggle value={!!prefs.data?.newsletter_opt_in} onChange={(v) => setNewsletter.mutate(v)} label="Grimore newsletter" />} last />
      </Group>

      <Group title="Payments">
        <Row icon={icon(CreditCardIcon)} label="Payment methods" value="Coming soon" onPress={soon} />
        <Row icon={icon(UsersThreeIcon)} label="Community memberships" value="Coming soon" onPress={soon} />
        <Row icon={icon(CrownSimpleIcon)} label="Grimore purchases" onPress={() => router.push('/corner/edit')} right={chevron} last />
      </Group>

      <Group title="Your data and account">
        <Row icon={icon(FileArrowDownIcon)} label="Export my data" value={exporting ? 'Preparing…' : 'Everything you added, as a JSON file'} onPress={() => void doExport()} right={chevron} />
        <Row icon={<TrashIcon size={20} color={colors.danger} />} label="Delete account" value="Delete your account and all its data" danger last onPress={() => void deleteAccount()} />
      </Group>

      <Group>
        <Row
          icon={<SignOutIcon size={20} color={colors.danger} />}
          label="Sign out"
          danger
          last
          onPress={() =>
            void confirmAction('Sign out?', 'You can sign back in any time.', 'Sign out').then((ok) => {
              if (ok) signOut().then(() => qc.clear(), (e) => toast(toAppError(e).message));
            })
          }
        />
      </Group>
      <Text variant="caption" tone="faint" align="center" style={{ marginTop: spacing.xl }}>
        Grimore
      </Text>
    </Screen>
  );
}
