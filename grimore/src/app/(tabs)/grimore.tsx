import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaretDownIcon, SpiralIcon, TimerIcon } from '@/components/icons';
import { LibraryFilters, LockedRoomSheet, RoomPicker, useLibrary } from '@/components/library-panel';
import { LibraryRoom, SCENES } from '@/components/library-room';
import { Cartouche, CartoucheText } from '@/components/ornament';
import { Press, Text } from '@/components/ui';
import { useCorner, useMyId } from '@/hooks/queries';
import { useReadingSession } from '@/stores/reading-session';
import { DarkTheme, fonts, GILT, layout, spacing } from '@/theme';

/**
 * My Grimore: your library, filling the whole tab. The room's name opens the
 * room picker; the filters sit on top; reading session and the wheel wait
 * at the bottom. Tap a book to open it, hold it to read its label.
 */
export default function GrimoreTab() {
  return (
    <DarkTheme>
      <Grimore />
    </DarkTheme>
  );
}

function Grimore() {
  const me = useMyId()!;
  const insets = useSafeAreaInsets();
  const corner = useCorner(me);
  const lib = useLibrary(me, true, corner.data?.library);
  const sessionOn = useReadingSession((s) => s.active);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rooms, setRooms] = useState(false);

  const insetTop = insets.top + 116 + (rooms ? 104 : 0);
  // The overlays fade into the room's own colour (dark rooms, or the light wall of Minimal Oak).
  const fade = SCENES[lib.shown].fade ?? '16,13,11';
  const insetBottom = layout.tabBarHeight + Math.max(insets.bottom, spacing.md) + 84;

  return (
    <View style={{ flex: 1, backgroundColor: GILT.black }} onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {size.width ? (
        <LibraryRoom
          scene={lib.shown}
          books={lib.books}
          locked={!!lib.preview && !lib.ownsScene(lib.preview)}
          empty={lib.loading ? undefined : 'Your shelves are waiting. Add books you own or have finished and they will appear here, grouped by saga.'}
          fill={{ width: size.width, height: size.height, insetTop, insetBottom }}
        />
      ) : null}

      {/* Top: the room's name (opens the room picker) and the filters. */}
      <LinearGradient pointerEvents="none" colors={[`rgba(${fade},0.92)`, `rgba(${fade},0.55)`, `rgba(${fade},0)`]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insetTop + 40 }} />
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top + spacing.sm, gap: spacing.md }}>
        <Press accessibilityLabel={`${SCENES[lib.shown].name}. Change library`} accessibilityState={{ expanded: rooms }} onPress={() => setRooms(!rooms)} style={{ alignSelf: 'center' }}>
          <Cartouche size="md">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CartoucheText size={18}>{SCENES[lib.shown].name}</CartoucheText>
              <CaretDownIcon size={14} color={GILT.champagne} style={{ transform: [{ rotate: rooms ? '180deg' : '0deg' }] }} />
            </View>
          </Cartouche>
        </Press>
        {rooms ? (
          <RoomPicker
            current={lib.current}
            ownsScene={lib.ownsScene}
            size={120}
            onPick={(s) => {
              lib.pick(s);
              if (lib.ownsScene(s)) setRooms(false);
            }}
          />
        ) : null}
        <LibraryFilters value={lib.filter} onChange={lib.setFilter} glass />
      </View>

      {/* Bottom: reading session and the wheel, above the tab bar. */}
      <LinearGradient pointerEvents="none" colors={[`rgba(${fade},0)`, `rgba(${fade},0.6)`, `rgba(${fade},0.95)`]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insetBottom + 30 }} />
      <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: layout.tabBarHeight + Math.max(insets.bottom, spacing.md) + spacing.base, flexDirection: 'row', gap: spacing.sm, maxWidth: 560, alignSelf: 'center' }}>
        <Press onPress={() => router.push('/reading-session')} style={{ flex: 1.3, height: 52, borderRadius: 26, backgroundColor: GILT.gold, borderWidth: 1, borderColor: GILT.champagne, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <TimerIcon size={18} color={GILT.black} weight="bold" />
          <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 15, color: GILT.black }}>
            {sessionOn ? 'Session running' : 'Start reading session'}
          </Text>
        </Press>
        <Press accessibilityLabel="What should I read next?" onPress={() => router.push('/wheel')} style={{ flex: 1, height: 52, borderRadius: 26, backgroundColor: 'rgba(37,23,15,0.92)', borderWidth: 1, borderColor: GILT.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <SpiralIcon size={18} color={GILT.champagne} />
          <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 15, color: GILT.champagne }}>
            What next?
          </Text>
        </Press>
      </View>

      <LockedRoomSheet scene={lib.preview && !lib.ownsScene(lib.preview) ? lib.preview : null} onClose={lib.closePreview} />
    </View>
  );
}
