import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import type { GameId } from '@/services/games';
import { fonts, useTheme } from '@/theme';
import { COVER_BLUR, COVER_ZOOM } from '@/utils/game-ui';

/** Small illustration for each daily game card. */
export function GameGlyph({ id, onAccent, cover }: { id: GameId; onAccent?: boolean; cover?: string | null }) {
  const { colors } = useTheme();
  if (id === 'hangman')
    return (
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {'B_B_L'.split('').map((c, i) => (
          <View key={i} style={{ width: 24, height: 32, borderRadius: 6, backgroundColor: onAccent ? 'rgba(0,0,0,0.1)' : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.monoBold, fontSize: 18 }} tone={onAccent ? 'onAccent' : 'ink'}>
              {c === '_' ? '' : c}
            </Text>
          </View>
        ))}
      </View>
    );
  if (id === 'cover')
    return (
      <View style={{ width: 44, height: 64, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surface3 }}>
        {/* As hidden as the game's first frame, so the card never gives the answer away. */}
        {cover ? <Image source={{ uri: cover }} blurRadius={COVER_BLUR[0]} style={{ width: '100%', height: '100%', transform: [{ scale: COVER_ZOOM[0] }] }} /> : null}
      </View>
    );
  if (id === 'clues')
    return (
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 1, 0, 0, 0].map((on, i) => (
          <View key={i} style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: on ? colors.accent : colors.surface3 }} />
        ))}
      </View>
    );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
      {[28, 40, 20, 52, 34].map((h, i) => (
        <View key={i} style={{ width: 12, height: h, borderRadius: 3, backgroundColor: colors.surface3 }} />
      ))}
    </View>
  );
}
