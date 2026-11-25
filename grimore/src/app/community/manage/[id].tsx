import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CaretRightIcon, MinusIcon, PlusIcon, UsersIcon } from '@/components/icons';
import { ImageField } from '@/components/image-field';
import { Toggle } from '@/components/switch';
import { Btn, IconBtn, Press, Screen, Skeleton, Text, TextField, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { getCommunity, type Community, updateCommunity, uploadCommunityImage } from '@/services/communities';
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

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['community', id] }), qc.invalidateQueries({ queryKey: ['communities'] })]);
  const save = useMutation({
    mutationFn: () => {
      if (name.trim().length < 3) throw new Error('Give it a name of at least 3 letters');
      return updateCommunity(id, { name: name.trim(), tagline: tagline.trim() || null, description: desc.trim() || null, price_cents: paid ? price * 100 : null });
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
