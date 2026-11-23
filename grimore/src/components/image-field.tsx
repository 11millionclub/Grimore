import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ImageIcon } from '@/components/icons';
import { Press, Text, toast } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

export type PickedImage = { uri: string; base64: string; mimeType: string };

/** Picks a photo from the library. Square for logos, 3:1 for banners. */
export async function pickImage(aspect: [number, number]): Promise<PickedImage | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.8, base64: true });
  const a = res.canceled ? null : res.assets?.[0];
  if (!a?.base64) return null;
  if (a.base64.length > 6_900_000) {
    toast('That image is too large. Pick one under 5 MB.');
    return null;
  }
  return { uri: a.uri, base64: a.base64, mimeType: a.mimeType ?? 'image/jpeg' };
}

/** Image slot with preview: tap to choose (and, with `onUpload`, upload straight away). */
export function ImageField({
  kind,
  label,
  hint,
  value,
  onPick,
  onUpload,
}: {
  kind: 'logo' | 'banner';
  label: string;
  hint?: string;
  value?: string | null;
  onPick?: (img: PickedImage) => void;
  onUpload?: (img: PickedImage) => Promise<unknown>;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const shown = local ?? value ?? null;
  const choose = async () => {
    const img = await pickImage(kind === 'logo' ? [1, 1] : [3, 1]);
    if (!img) return;
    setLocal(img.uri);
    onPick?.(img);
    if (onUpload) {
      setBusy(true);
      try {
        await onUpload(img);
        toast(kind === 'logo' ? 'Logo updated' : 'Banner updated');
      } catch (e) {
        setLocal(null);
        toast((e as Error).message);
      } finally {
        setBusy(false);
      }
    }
  };
  return (
    <View style={{ gap: 6 }}>
      <Text variant="small" style={{ fontWeight: '600' }}>
        {label}
      </Text>
      <Press
        accessibilityRole="button"
        accessibilityLabel={`${shown ? 'Change' : 'Upload'} ${label.toLowerCase()}`}
        onPress={() => void choose()}
        style={{
          width: kind === 'logo' ? 96 : '100%',
          aspectRatio: kind === 'logo' ? 1 : 3,
          borderRadius: kind === 'logo' ? 48 : radius.card,
          borderWidth: 1,
          borderStyle: shown ? 'solid' : 'dashed',
          borderColor: shown ? colors.line : colors.lineStrong,
          backgroundColor: colors.surface2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {shown ? <Image source={{ uri: shown }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : null}
        {busy ? (
          <ActivityIndicator color={colors.accent} />
        ) : !shown ? (
          <View style={{ alignItems: 'center', gap: 4, padding: spacing.sm }}>
            <ImageIcon size={22} color={colors.muted} />
            <Text variant="caption" tone="muted">
              Upload
            </Text>
          </View>
        ) : null}
      </Press>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
