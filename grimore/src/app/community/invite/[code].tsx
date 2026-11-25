import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CommunityLogo } from '@/components/books';
import { KeyIcon, LockSimpleIcon, MaskHappyIcon } from '@/components/icons';
import { Avatar, Btn, EmptyState, Screen, Skeleton, Text, TextField, toast } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { joinByInvite, previewInvite } from '@/services/communities';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { money } from '@/utils/money';

const clean = (c: string) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);

/** Opens an invite (from a link, or a code typed in) and joins the community. */
export default function InviteScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const fromLink = params.code && params.code !== 'enter' ? clean(params.code) : '';
  const [typed, setTyped] = useState('');
  const [code, setCode] = useState(fromLink);
  const { colors } = useTheme();
  const qc = useQueryClient();
  const preview = useQuery({ queryKey: ['invite', code], queryFn: () => previewInvite(code), enabled: code.length >= 6 });
  const join = useMutation({
    mutationFn: () => joinByInvite(code),
    onSuccess: (communityId) => {
      void qc.invalidateQueries({ queryKey: ['communities'] });
      void qc.invalidateQueries({ queryKey: ['my-communities'] });
      void qc.invalidateQueries({ queryKey: ['community', communityId] });
      toast('Welcome in');
      router.replace({ pathname: '/community/[id]', params: { id: communityId } });
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const p = preview.data;

  return (
    <Screen title="Invite" back keyboard>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        {!code ? (
          <View style={{ gap: spacing.md }}>
            <Text variant="body" tone="muted">
              Private communities are joined with a code from their host.
            </Text>
            <TextField label="Invite code" value={typed} onChangeText={(x) => setTyped(clean(x))} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. 7CEB9D3BB6" left={<KeyIcon size={18} color={colors.muted} />} onSubmitEditing={() => setCode(typed)} />
            <Btn size="lg" full disabled={typed.length < 6} onPress={() => setCode(typed)}>
              Open invite
            </Btn>
          </View>
        ) : preview.isLoading ? (
          <Skeleton height={220} rounded={radius.card} />
        ) : !p ? (
          <EmptyState title="This invite doesn’t work" body="It may have expired, been used up or withdrawn. Ask the host for a new one." action="Try another code" onAction={() => setCode('')} />
        ) : (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
            <CommunityLogo url={p.logo_url} size={64} />
            <Text align="center" style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 33 }}>
              {p.name}
            </Text>
            {p.tagline ? (
              <Text variant="callout" tone="muted" align="center">
                {p.tagline}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Avatar uri={p.host?.avatar_url} name={p.host?.display_name ?? p.host?.username} size={22} />
              <Text variant="small" tone="muted">
                Hosted by {p.host?.display_name ?? p.host?.username} · {p.member_count} members
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
              {p.is_private ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.surface2 }}>
                  <LockSimpleIcon size={12} color={colors.ink} />
                  <Text variant="caption">Private</Text>
                </View>
              ) : null}
              {p.is_anonymous ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.surface2 }}>
                  <MaskHappyIcon size={12} color={colors.ink} />
                  <Text variant="caption">Anonymous: no one sees who wrote what</Text>
                </View>
              ) : null}
              <View style={{ borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.surface2 }}>
                <Text variant="caption">{p.price_cents ? `Members ${money(p.price_cents)}/month` : 'Free'}</Text>
              </View>
            </View>
            {p.already_member ? (
              <Btn size="lg" full onPress={() => router.replace({ pathname: '/community/[id]', params: { id: p.community_id } })}>
                You’re in · open it
              </Btn>
            ) : (
              <Btn size="lg" full loading={join.isPending} onPress={() => join.mutate()}>
                Join {p.name}
              </Btn>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
