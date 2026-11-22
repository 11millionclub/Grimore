import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { HOUSE_NAMES, type HouseId } from '@/theme/houses';

/**
 * House sigils: four objects from the world of books, each with its own
 * silhouette so a House is recognisable without colour, down to 16 px.
 * Drawn on a 24-unit grid in a single colour.
 */
export function Sigil({ house, size = 24, color, label }: { house: HouseId; size?: number; color: string; label?: string | false }) {
  const a11y = label === false ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const } : { accessibilityLabel: label ?? `${HOUSE_NAMES[house]} sigil`, accessibilityRole: 'image' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...a11y}>
      {house === 'lantern' ? <Moth color={color} /> : house === 'quill' ? <Quill color={color} /> : house === 'thorn' ? <Rose color={color} /> : <Glass color={color} />}
    </Svg>
  );
}

/** Lantern: a moth, drawn to the light. Four broad wings, narrow body, antennae. */
function Moth({ color }: { color: string }) {
  return (
    <>
      <Path d="M11 10.2C8.6 5.6 4.2 4.6 2.6 6.4 1.4 7.8 2.4 11.4 5.6 12.2 7.6 12.7 9.6 12.2 11 11.6Z" fill={color} />
      <Path d="M13 10.2C15.4 5.6 19.8 4.6 21.4 6.4 22.6 7.8 21.6 11.4 18.4 12.2 16.4 12.7 14.4 12.2 13 11.6Z" fill={color} />
      <Path d="M11 13C9 13.4 6.6 15 6.4 17.4 6.3 19.2 8.6 19.6 9.8 18 10.6 16.9 11 15.2 11.2 13.6Z" fill={color} />
      <Path d="M13 13C15 13.4 17.4 15 17.6 17.4 17.7 19.2 15.4 19.6 14.2 18 13.4 16.9 13 15.2 12.8 13.6Z" fill={color} />
      <Ellipse cx={12} cy={12.6} rx={1.3} ry={5.2} fill={color} />
      <Path d="M11.5 7.6C11 5.6 10 4.2 8.6 3.4M12.5 7.6C13 5.6 14 4.2 15.4 3.4" stroke={color} strokeWidth={1.2} strokeLinecap="round" fill="none" />
    </>
  );
}

/** Quill: a feather on a diagonal, with its shaft and nib. */
function Quill({ color }: { color: string }) {
  return (
    <>
      <Path d="M20.6 2.6C14.2 3.4 8.8 7.6 7.2 14.6 9.6 13.4 11.6 13.8 13.4 12.8 12 12.6 11.2 12.2 10.6 11.6 13.4 11.4 15.6 10.4 17 8.6 15.6 8.6 14.6 8.4 14 7.8 16.8 7.2 19.2 5.6 20.6 2.6Z" fill={color} />
      <Path d="M18.4 5L4.2 21" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M4.2 21L3.4 22.2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </>
  );
}

/** Thorn: a rose head on a stem with two thorns and a leaf. */
function Rose({ color }: { color: string }) {
  return (
    <>
      <Path d="M12 2.4C14.8 2.4 17.2 4.2 17.2 7 17.2 9.8 14.8 11.6 12 11.6 9.2 11.6 6.8 9.8 6.8 7 6.8 5.6 7.4 4.6 8.4 4 8.8 5.4 9.8 6.2 11 6.2 10.4 5 10.8 3.4 12 2.4Z" fill={color} />
      <Path d="M12 11.2V22" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M12 14.2L8.4 12.6 12 15.9Z" fill={color} stroke={color} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M12 18.2L15.6 16.6 12 19.9Z" fill={color} stroke={color} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M12 21C10.8 19.6 8.8 19.2 6.8 19.8 7.8 21.4 10 21.8 12 21Z" fill={color} />
    </>
  );
}

/** Hourglass: two bulbs between two bars, sand settling at the bottom. */
function Glass({ color }: { color: string }) {
  return (
    <>
      <Rect x={4.6} y={2} width={14.8} height={2.4} rx={1} fill={color} />
      <Rect x={4.6} y={19.6} width={14.8} height={2.4} rx={1} fill={color} />
      <Path d="M7 4.4H17C17 8 13.6 10.2 12.9 12 13.6 13.8 17 16 17 19.6H7C7 16 10.4 13.8 11.1 12 10.4 10.2 7 8 7 4.4Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
      <Path d="M8.6 18.8C9.4 16.8 11 16 12 15.4 13 16 14.6 16.8 15.4 18.8Z" fill={color} />
      <Circle cx={12} cy={8.4} r={0.9} fill={color} />
    </>
  );
}
