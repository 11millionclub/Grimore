import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { View } from 'react-native';

import { CopyIcon, GiftIcon, ShareNetworkIcon } from '@/components/icons';
import { Btn, Screen, Text, TextField, shareText, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { INVITE_POINTS, inviteLink, inviteStats, myInviteCode, redeemInvite } from '@/services/invites';
import { fonts, radius, spacing, useTheme } from '@/theme';

/** Your invite code and link; both sides get points when a friend joins with it. */
export default function InviteScreen() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const code = useQuery({ queryKey: ['invite', 'code', me], queryFn: myInviteCode, staleTime: Infinity });
  const stats = useQuery({ queryKey: ['invite', 'stats', me], queryFn: () => inviteStats(me) });
  const [entered, setEntered] = useState('');
  const link = code.data ? inviteLink(code.data) : '';
  const redeem = useMutation({
    mutationFn: () => redeemInvite(entered),
    onSuccess: (r) => {
      setEntered('');
      void qc.invalidateQueries({ queryKey: ['invite'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
      toast(`Welcome gift: +${r.points} points`);
    },
    onError: (e) => toast(toAppError(e).message),
  });

  return (
    <Screen title="Invite friends" back keyboard>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.base }}>
        <Text variant="body" tone="muted">
          Share your code. When a friend joins with it, you get {INVITE_POINTS.inviter} points and they get {INVITE_POINTS.invitee}. Points go to your wallet, to spend on My Grimore items and shop discounts.
        </Text>

        <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.line }}>
          <GiftIcon size={28} weight="duotone" color={colors.gold} />
          <Text variant="small" tone="muted">
            Your code
          </Text>
          <Text selectable accessibilityLabel={`Your invite code ${code.data ?? ''}`} style={{ fontFamily: fonts.monoBold, fontSize: 30, lineHeight: 36, letterSpacing: 3 }}>
            {code.data ?? '········'}
          </Text>
          <Text variant="caption" tone="faint" numberOfLines={1} selectable>
            {link}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignSelf: 'stretch' }}>
            <Btn
              variant="secondary"
              style={{ flex: 1 }}
              disabled={!code.data}
              icon={<CopyIcon size={16} color={colors.ink} />}
              onPress={() => void Clipboard.setStringAsync(link).then(() => toast('Link copied'))}
            >
              Copy link
            </Btn>
            <Btn style={{ flex: 1 }} disabled={!code.data} icon={<ShareNetworkIcon size={16} color={colors.onAccent} />} onPress={() => void shareText(`Join me on Grimore, where readers log books, play the daily games and find their House. Use my code ${code.data}: ${link}`)}>
              Share
            </Btn>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat value={stats.data?.joined ?? 0} label="friends joined" />
          <Stat value={stats.data?.points ?? 0} label="points from invites" />
        </View>

        {stats.data && !stats.data.usedCode ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Text variant="bodyStrong">Got a code from a friend?</Text>
            <TextField value={entered} onChangeText={(v) => setEntered(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))} placeholder="ABCD2345" autoCapitalize="characters" accessibilityLabel="Friend's invite code" />
            <Btn variant="secondary" disabled={entered.length < 6} loading={redeem.isPending} onPress={() => redeem.mutate()}>
              Use code
            </Btn>
            <Text variant="caption" tone="muted">
              Codes work in your first 14 days.
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
      <Text variant="num">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}
