import { View } from 'react-native';

import { ArchFrame } from '@/components/ornaments';
import { Avatar } from '@/components/ui';
import type { NookFrame } from '@/features/nook/use-nook';
import { useTheme } from '@/theme';

/** The reader's portrait inside their chosen frame: gothic arch, roundel or shield. */
export function Portrait({ name, uri, frame, size = 104, color }: { name: string; uri?: string | null; frame: NookFrame; size?: number; color?: string }) {
  const { colors } = useTheme();
  const ring = color ?? colors.gold;

  if (frame === 'arch') {
    return (
      <ArchFrame width={size} color={ring}>
        <Avatar name={name} uri={uri} size={size * 1.3} square />
      </ArchFrame>
    );
  }

  if (frame === 'shield') {
    const h = size * 1.2;
    return (
      <View style={{ padding: 5, borderWidth: 1.5, borderColor: ring, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: size, borderBottomRightRadius: size, backgroundColor: colors.canvas }}>
        <View style={{ width: size, height: h, overflow: 'hidden', borderTopLeftRadius: 3, borderTopRightRadius: 3, borderBottomLeftRadius: size, borderBottomRightRadius: size, alignItems: 'center', justifyContent: 'center' }}>
          <Avatar name={name} uri={uri} size={h} square />
        </View>
      </View>
    );
  }

  return (
    <View style={{ padding: 5, borderRadius: size, borderWidth: 1.5, borderColor: ring, backgroundColor: colors.canvas }}>
      <Avatar name={name} uri={uri} size={size} />
    </View>
  );
}
