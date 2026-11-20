import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Btn, Press, Screen, Text, TextField, toast } from '@/components/ui';
import { useMyId, useMyProfile } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { isUsernameAvailable, updateProfile, uploadAvatar } from '@/services/profile';
import { fonts, spacing } from '@/theme';
import { usernameSchema } from '@/validation/schemas';

export default function EditProfile() {
  const me = useMyId()!;
  const qc = useQueryClient();
  const profile = useMyProfile();
  const p = profile.data;
  const [name, setName] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const v = { name: name ?? p?.display_name ?? '', handle: handle ?? p?.username ?? '', bio: bio ?? p?.bio ?? '', city: city ?? p?.city ?? '' };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    const a = res.assets?.[0];
    if (res.canceled || !a?.base64) return;
    try {
      setAvatar(await uploadAvatar(me, a.base64, a.mimeType ?? 'image/jpeg'));
    } catch (e) {
      toast(toAppError(e).message);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const u = usernameSchema.safeParse(v.handle);
      if (!u.success) throw new Error(u.error.issues[0]?.message ?? 'Check your username');
      if (u.data.toLowerCase() !== p?.username.toLowerCase() && !(await isUsernameAvailable(u.data))) throw new Error('That username is taken');
      await updateProfile(me, { display_name: v.name.trim() || null, username: u.data.toLowerCase(), bio: v.bio.trim() || null, city: v.city.trim() || null, ...(avatar ? { avatar_url: avatar } : {}) });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.profile(me) });
      router.back();
      toast('Profile saved');
    },
    onError: (e) => toast(e instanceof Error && !('code' in e) ? e.message : toAppError(e).message),
  });

  return (
    <Screen
      title="Edit profile"
      large={false}
      back
      keyboard
      actions={
        <Btn size="sm" variant="ghost" loading={save.isPending} onPress={() => save.mutate()}>
          Save
        </Btn>
      }
    >
      <View style={{ alignItems: 'center', paddingBottom: spacing.xl, paddingTop: spacing.sm }}>
        <Avatar uri={avatar ?? p?.avatar_url} name={v.name} size={96} />
        <Press onPress={pickPhoto} style={{ marginTop: spacing.md }}>
          <Text variant="callout" tone="accent" style={{ fontFamily: fonts.semibold }}>
            Change photo
          </Text>
        </Press>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.base }}>
        <TextField label="Name" value={v.name} onChangeText={setName} maxLength={60} autoCapitalize="words" />
        <TextField label="Username" value={v.handle} onChangeText={(x) => setHandle(x.toLowerCase().replace(/[^a-z0-9._]/g, ''))} prefix="@" autoCapitalize="none" maxLength={24} />
        <TextField label="Bio" value={v.bio} onChangeText={(x) => setBio(x.slice(0, 160))} multiline helper={`${v.bio.length}/160`} />
        <TextField label="City" value={v.city} onChangeText={setCity} maxLength={60} helper="Only used for the Market, never your exact location." />
      </View>
    </Screen>
  );
}
