import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Avatar, Button, InlineAlert, Screen, Text, TextField } from '@/components/ui';
import { useMyProfile } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { isUsernameAvailable, updateProfile, uploadAvatar } from '@/services/profile';
import { spacing, useTheme } from '@/theme';
import { profileSchema, type ProfileValues } from '@/validation/schemas';

export default function EditProfile() {
  const profile = useMyProfile();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [uploadedAvatar, setAvatar] = useState<string | null>(null);
  const avatar = uploadedAvatar ?? profile.data?.avatar_url ?? null;
  const [uploading, setUploading] = useState(false);

  const { control, handleSubmit, reset, formState, setError: setFieldError } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { display_name: '', username: '', bio: '' },
  });

  useEffect(() => {
    if (profile.data) {
      reset({ display_name: profile.data.display_name ?? '', username: profile.data.username, bio: profile.data.bio ?? '' });
    }
  }, [profile.data, reset]);

  const pickAvatar = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (result.canceled || !result.assets[0]?.base64 || !profile.data) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const url = await uploadAvatar(profile.data.id, asset.base64!, asset.mimeType ?? 'image/jpeg');
      const updated = await updateProfile(profile.data.id, { avatar_url: url });
      queryClient.setQueryData(qk.profile(profile.data.id), updated);
      setAvatar(url);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = handleSubmit(async (v) => {
    if (!profile.data) return;
    setError(null);
    try {
      if (v.username.toLowerCase() !== profile.data.username.toLowerCase() && !(await isUsernameAvailable(v.username))) {
        setFieldError('username', { message: 'That username is taken' });
        return;
      }
      const updated = await updateProfile(profile.data.id, { display_name: v.display_name, username: v.username.toLowerCase(), bio: v.bio || null });
      queryClient.setQueryData(qk.profile(profile.data.id), updated);
      router.back();
    } catch (e) {
      setError(toAppError(e).message);
    }
  });

  const name = profile.data?.display_name ?? profile.data?.username ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar mode="close" title="Edit profile" />
      <Screen keyboard edgeTop={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change profile picture" onPress={() => void pickAvatar()} style={{ alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
          <Avatar name={name} uri={avatar} size={96} />
          <Text variant="callout" tone="accent">
            {uploading ? 'Uploading…' : 'Change photo'}
          </Text>
        </Pressable>
        <View style={{ gap: spacing.lg }}>
          {error ? <InlineAlert>{error}</InlineAlert> : null}
          <Controller control={control} name="display_name" render={({ field, fieldState }) => <TextField label="Name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
          <Controller
            control={control}
            name="username"
            render={({ field, fieldState }) => (
              <TextField label="Username" value={field.value} onChangeText={(t) => field.onChange(t.replace(/\s/g, '').toLowerCase())} error={fieldState.error?.message} autoCapitalize="none" autoCorrect={false} leadingIcon="at-sign" />
            )}
          />
          <Controller
            control={control}
            name="bio"
            render={({ field, fieldState }) => (
              <TextField label="Bio" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} multiline maxLength={280} placeholder="What kind of reader are you?" hint={`${field.value.length}/280`} />
            )}
          />
          <Button title="Save" size="lg" fullWidth loading={formState.isSubmitting} onPress={onSubmit} />
        </View>
      </Screen>
    </View>
  );
}
