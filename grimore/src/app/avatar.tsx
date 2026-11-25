import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { ShuffleIcon } from '@/components/icons';
import { Btn, Press, Screen, Text, toast } from '@/components/ui';
import { useMyId, useMyProfile } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { updateProfile } from '@/services/profile';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { AVATAR_OPTIONS, AVATAR_PARTS, avatarSvg, decodeAvatar, DEFAULT_AVATAR, encodeAvatar, randomAvatar, type AvatarConfig, type AvatarPart } from '@/utils/avatar';

/** Build a picture for your profile from faces, hair, colours and accessories. */
export default function AvatarBuilder() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const profile = useMyProfile();
  const [cfg, setCfg] = useState<AvatarConfig>(() => decodeAvatar(profile.data?.avatar_url) ?? DEFAULT_AVATAR);
  const [part, setPart] = useState<AvatarPart>('hair');
  const svg = useMemo(() => avatarSvg(cfg, 200), [cfg]);

  const save = useMutation({
    // Saved as a short code and drawn by the app: nothing to upload, works the same on every device.
    mutationFn: () => updateProfile(me, { avatar_url: encodeAvatar(cfg) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.profile(me) });
      toast('Avatar saved');
      router.back();
    },
    onError: (e) => toast(toAppError(e).message),
  });

  const options = AVATAR_OPTIONS[part];
  const isColour = part === 'bg' || part === 'skin' || part === 'hairColor';

  return (
    <Screen
      title="Create avatar"
      back
      actions={
        <Btn size="sm" variant="ghost" loading={save.isPending} onPress={() => save.mutate()}>
          Use
        </Btn>
      }
    >
      <View style={{ alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg }}>
        <View style={{ width: 200, height: 200, borderRadius: 100, overflow: 'hidden', borderWidth: 3, borderColor: colors.gold }} accessibilityLabel="Your avatar">
          <SvgXml xml={svg} width={200} height={200} />
        </View>
        <Press accessibilityLabel="Surprise me" onPress={() => setCfg(randomAvatar())} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface2 }}>
          <ShuffleIcon size={16} color={colors.ink} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Surprise me</Text>
        </Press>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        {AVATAR_PARTS.map((p) => {
          const on = p.key === part;
          return (
            <Press key={p.key} accessibilityState={{ selected: on }} onPress={() => setPart(p.key)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? colors.accent : colors.surface2 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: on ? colors.onAccent : colors.ink }}>{p.label}</Text>
            </Press>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        {options.map((label, i) => {
          const on = cfg[part] === i;
          return (
            <Press key={label} accessibilityLabel={isColour ? `${AVATAR_PARTS.find((p) => p.key === part)?.label} ${i + 1}` : label} accessibilityState={{ selected: on }} onPress={() => setCfg((c) => ({ ...c, [part]: i }))} style={{ width: 76, alignItems: 'center', gap: 4 }}>
              <View style={{ width: 72, height: 72, borderRadius: radius.tile, overflow: 'hidden', borderWidth: 2, borderColor: on ? colors.gold : colors.line, backgroundColor: isColour ? label : colors.surface }}>
                {isColour ? null : <SvgXml xml={avatarSvg({ ...cfg, [part]: i }, 72)} width={68} height={68} />}
              </View>
              {isColour ? null : (
                <Text variant="caption" tone={on ? undefined : 'muted'} numberOfLines={1}>
                  {label}
                </Text>
              )}
            </Press>
          );
        })}
      </View>
    </Screen>
  );
}
