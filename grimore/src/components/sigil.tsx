import Svg, { Circle, Path } from 'react-native-svg';

import { HOUSE_NAMES, type HouseId } from '@/theme/houses';

/**
 * House symbols from the Sorting specification: a compass (Wanderers), an
 * endless thread (Weavers), a starburst (Luminaries) and a key (Seekers).
 * Each has its own silhouette so a House is recognisable without colour,
 * down to 16 px. Drawn on a 24-unit grid in a single colour.
 */
export function Sigil({ house, size = 24, color, label }: { house: HouseId; size?: number; color: string; label?: string | false }) {
  const a11y = label === false ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const } : { accessibilityLabel: label ?? `${HOUSE_NAMES[house]} symbol`, accessibilityRole: 'image' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...a11y}>
      {house === 'wanderers' ? <Compass color={color} /> : house === 'weavers' ? <Thread color={color} /> : house === 'luminaries' ? <Starburst color={color} /> : <Key color={color} />}
    </Svg>
  );
}

/** Wanderers: a compass with its ring, ticks and a diagonal needle. */
function Compass({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={13} r={8.6} stroke={color} strokeWidth={1.8} fill="none" />
      <Circle cx={12} cy={3.2} r={1.3} stroke={color} strokeWidth={1.2} fill="none" />
      <Path d="M12 5.6V6.8M12 19.2V20.4M4.6 13H5.8M18.2 13H19.4" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M16.4 8.6L13.2 14.2 10.8 11.8Z" fill={color} />
      <Path d="M7.6 17.4L10.8 11.8 13.2 14.2Z" fill={color} opacity={0.55} />
      <Circle cx={12} cy={13} r={1.1} fill={color} />
    </>
  );
}

/** Weavers: one unbroken thread looping into an infinity knot. */
function Thread({ color }: { color: string }) {
  return (
    <>
      <Path
        d="M12 12C10 9.2 8.4 7.6 6.2 7.6 3.6 7.6 2 9.6 2 12 2 14.4 3.6 16.4 6.2 16.4 8.4 16.4 10 14.8 12 12 14 9.2 15.6 7.6 17.8 7.6 20.4 7.6 22 9.6 22 12 22 14.4 20.4 16.4 17.8 16.4 15.6 16.4 14 14.8 12 12Z"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );
}

/** Luminaries: a four-pointed starburst with fine rays between the points. */
function Starburst({ color }: { color: string }) {
  return (
    <>
      <Path d="M12 1.5L13.7 10.3 22.5 12 13.7 13.7 12 22.5 10.3 13.7 1.5 12 10.3 10.3Z" fill={color} />
      <Path d="M5.6 5.6L8.6 8.6M18.4 5.6L15.4 8.6M5.6 18.4L8.6 15.4M18.4 18.4L15.4 15.4" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </>
  );
}

/** Seekers: an old key with a trefoil bow and two bit teeth. */
function Key({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={4.4} r={2.6} fill={color} />
      <Circle cx={8.9} cy={7.4} r={2.6} fill={color} />
      <Circle cx={15.1} cy={7.4} r={2.6} fill={color} />
      <Path d="M10.9 8.6H13.1V21.6C13.1 22.2 12.6 22.6 12 22.6 11.4 22.6 10.9 22.2 10.9 21.6Z" fill={color} />
      <Path d="M13.1 15.4H16.4V17.4H13.1ZM13.1 19H15.4V20.8H13.1Z" fill={color} />
    </>
  );
}
