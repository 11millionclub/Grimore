import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CaretRightIcon, LinkIcon, LockSimpleIcon, MaskHappyIcon, MinusIcon, PlusIcon, ShareNetworkIcon, UsersIcon, XIcon } from '@/components/icons';
import { ImageField } from '@/components/image-field';
import { Toggle } from '@/components/switch';
import { Btn, IconBtn, Press, Screen, shareText, Skeleton, Text, TextField, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { createInvite, getCommunity, inviteLink, listInvites, revokeInvite, type Community, updateCommunity, uploadCommunityImage } from '@/services/communities';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { money } from '@/utils/money';

/** The host's settings: details, membership price, logo and banner (any time), and the member list. */
export default function ManageCommunity() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMyId()!;
  const c = useQuery({ queryKey: ['community', id], queryFn: () => getCommunity(id) });
  const d = c.data;
  if (!d) return <Screen title="Manage" back><Skeleton height={300} /></Screen>;
  if (d.host_id !== me) return <Screen title="Manage" back><Text tone="muted" style={{ padding: spacing.lg }}>Only the host can manage this community.</Text></Screen>;
  return <ManageForm d={d} />;
}

function ManageForm({ d }: { d: Community }) {
  const id = d.id;
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [name, setName] = useState(d.name);
  const [tagline, setTagline] = useState(d.tagline ?? '');
  const [desc, setDesc] = useState(d.description ?? '');
  const [paid, setPaid] = useState(d.price_cents != null);
  const [price, setPrice] = useState(d.price_cents ? Math.round(d.price_cents / 100) : 4);
  const [isPrivate, setPrivate] = useState(d.is_private);
  const [anonymous, setAnonymous] = useState(d.is_anonymous);
  const invites = useQuery({ queryKey: ['community', id, 'invites'], queryFn: () => listInvites(id), enabled: isPrivate });
  const share = (code: string) => void shareText(`Join ${d.name} on Grimore: ${inviteLink(code)}\nInvite code: ${code}`);
  const newInvite = useMutation({
    mutationFn: () => createInvite(id),
    onSuccess: (code) => {
      void qc.invalidateQueries({ queryKey: ['community', id, 'invites'] });
      share(code);
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const revoke = useMutation({
    mutationFn: (code: string) => revokeInvite(code),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['community', id, 'invites'] });
      toast('Invite withdrawn');
    },
    onError: (e) => toast(toAppError(e).message),
  });

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['community', id] }), qc.invalidateQueries({ queryKey: ['communities'] })]);
  const save = useMutation({
    mutationFn: () => {
      if (name.trim().length < 3) throw new Error('Give it a name of at least 3 letters');
      return updateCommunity(id, { name: name.trim(), tagline: tagline.trim() || null, description: desc.trim() || null, price_cents: paid ? price * 100 : null, is_private: isPrivate, is_anonymous: anonymous });
    },
    onSuccess: async () => {
      await refresh();
      toast('Community saved');
      router.back();
    },
    onError: (e) => toast(e instanceof Error && !('code' in e) ? e.message : toAppError(e).message),
  });

  const card = { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.base, gap: spacing.md } as const;
  return (
    <Screen
      title="Manage community"
      back
      keyboard
      actions={
        <Btn size="sm" variant="ghost" loading={save.isPending} onPress={() => save.mutate()}>
          Save
        </Btn>
      }
    >
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <Press accessibilityLabel="Members" onPress={() => router.push({ pathname: '/community/members/[id]', params: { id } })} style={[card, { flexDirection: 'row', alignItems: 'center' }]}>
          <UsersIcon size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Members</Text>
            <Text variant="small" tone="muted">
              {d.member_count} {d.member_count === 1 ? 'reader' : 'readers'} · see everyone and message them
            </Text>
          </View>
          <CaretRightIcon size={16} color={colors.muted} />
        </Press>

        <View style={card}>
          <Text variant="bodyStrong">Details</Text>
          <TextField label="Name" value={name} onChangeText={setName} maxLength={60} />
          <TextField label="Tagline" value={tagline} onChangeText={setTagline} maxLength={160} />
          <TextField label="Description" value={desc} onChangeText={setDesc} multiline maxLength={4000} />
        </View>

        <View style={card}>
          <Text variant="bodyStrong">Privacy</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <LockSimpleIcon size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="callout" style={{ fontFamily: fonts.medium }}>
                Private
              </Text>
              <Text variant="small" tone="muted">
                Hidden from search. People join only with your invite.
              </Text>
            </View>
            <Toggle label="Private community" value={isPrivate} onChange={setPrivate} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <MaskHappyIcon size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="callout" style={{ fontFamily: fonts.medium }}>
                Anonymous discussions
              </Text>
              <Text variant="small" tone="muted">
                {d.is_anonymous ? 'No one sees who wrote what. Once there are posts this stays on, so no one is ever revealed.' : 'No one sees who wrote what, not even you. Posts can still be reported and removed.'}
              </Text>
            </View>
            <Toggle label="Anonymous discussions" value={anonymous} onChange={setAnonymous} />
          </View>
        </View>

        {isPrivate ? (
          <View style={card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                Invites
              </Text>
              <Btn size="sm" icon={<LinkIcon size={14} color={colors.onAccent} />} loading={newInvite.isPending} onPress={() => (d.is_private ? newInvite.mutate() : toast('Save first to make the community private'))}>
                New invite
              </Btn>
            </View>
            <Text variant="small" tone="muted">
              Each invite is a link and a code, valid for 30 days. Withdraw one at any time.
            </Text>
            {(invites.data ?? []).map((inv) => (
              <View key={inv.code} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface2, borderRadius: radius.tile, padding: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.monoBold, fontSize: 16, letterSpacing: 1 }}>{inv.code}</Text>
                  <Text variant="caption" tone="muted">
                    Used {inv.uses}
                    {inv.max_uses ? ` of ${inv.max_uses}` : ''} · until {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <IconBtn label={`Share invite ${inv.code}`} size={34} filled onPress={() => share(inv.code)}>
                  <ShareNetworkIcon size={16} color={colors.ink} />
                </IconBtn>
                <IconBtn label={`Withdraw invite ${inv.code}`} size={34} filled onPress={() => revoke.mutate(inv.code)}>
                  <XIcon size={16} color={colors.ink} />
                </IconBtn>
              </View>
            ))}
          </View>
        ) : null}

        <View style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Paid membership</Text>
              <Text variant="small" tone="muted">
                Visitors stay free; members pay monthly for every discussion and live sessions.
              </Text>
            </View>
            <Toggle label="Paid membership" value={paid} onChange={setPaid} />
          </View>
          {paid ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
              <IconBtn label="Lower price" size={32} filled onPress={() => setPrice(Math.max(1, price - 1))}>
                <MinusIcon size={14} weight="bold" color={colors.ink} />
              </IconBtn>
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, width: 90, textAlign: 'center' }}>{money(price * 100)}/mo</Text>
              <IconBtn label="Raise price" size={32} filled onPress={() => setPrice(Math.min(99, price + 1))}>
                <PlusIcon size={14} weight="bold" color={colors.ink} />
              </IconBtn>
            </View>
          ) : null}
        </View>

        {paid ? (
          <View style={card}>
            <Text variant="bodyStrong">Logo and banner</Text>
            <Text variant="small" tone="muted">
              Change them whenever you like. {d.price_cents == null ? 'Save to make the membership paid.' : ''}
            </Text>
            <ImageField kind="logo" label="Logo" hint="Square image, shown on your community." value={d.logo_url} onUpload={(img) => uploadCommunityImage(id, 'logo', img.base64, img.mimeType).then(refresh)} />
            <ImageField
              kind="banner"
              label="Banner"
              hint="Wide image (3:1). Paying members can wear it on their My Grimore page."
              value={d.banner_url}
              onUpload={(img) => uploadCommunityImage(id, 'banner', img.base64, img.mimeType).then(refresh)}
            />
          </View>
        ) : (
          <Text variant="small" tone="muted" align="center">
            Turn on paid membership to add a logo and a banner.
          </Text>
        )}
      </View>
    </Screen>
  );
}
