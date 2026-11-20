import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Cover } from '@/components/ui';
import { useTheme } from '@/theme';

/** Open Library covers of public catalogue classics, shown before sign-in. */
const COVERS = [
  ['Dune', 11481354],
  ['The Hobbit', 14627509],
  ['Jane Eyre', 8235363],
  ['Nineteen Eighty-Four', 9267242],
  ['The Little Prince', 13578797],
  ['Frankenstein', 15266215],
  ['Rebecca', 8238729],
  ['The Great Gatsby', 10590366],
  ['Beloved', 8261367],
  ['Normal People', 8794265],
  ['Dracula', 12216503],
  ['One Hundred Years of Solitude', 15185412],
  ['Pride and Prejudice', 14348537],
  ['Brave New World', 8231823],
  ['The Handmaid’s Tale', 8231851],
  ['Wuthering Heights', 12818862],
  ['The Alchemist', 15075893],
  ['The Secret History', 744854],
] as const;
const url = (id: number) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`;

function Column({ items, up, width }: { items: (typeof COVERS)[number][]; up: boolean; width: number }) {
  const y = useSharedValue(up ? 0 : -120);
  useEffect(() => {
    y.value = withRepeat(withTiming(up ? -120 : 0, { duration: 14000, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1, true);
  }, [up, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[{ gap: 12, width }, style]}>
      {items.map(([title, id], k) => (
        <Cover key={`${id}-${k}`} uri={url(id)} title={title} width={width} />
      ))}
    </Animated.View>
  );
}

/** Slowly drifting wall of covers, three columns in opposite directions. */
export function CoverWall({ height }: { height: number }) {
  const { colors } = useTheme();
  const w = 118;
  const cols = [0, 1, 2].map((c) => [...COVERS.slice(c * 6, c * 6 + 6), ...COVERS.slice(((c + 1) % 3) * 6, ((c + 1) % 3) * 6 + 2)]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', top: -40, left: -30, right: -30, flexDirection: 'row', justifyContent: 'center', gap: 12, transform: [{ rotate: '-8deg' }] }}>
        {cols.map((items, c) => (
          <Column key={c} items={items} up={c !== 1} width={w} />
        ))}
      </View>
      <LinearGradient colors={[colors.bg + '4d', colors.bg + '66', colors.bg]} locations={[0, 0.5, 1]} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}
