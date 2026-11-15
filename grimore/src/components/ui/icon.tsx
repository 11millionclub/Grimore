import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { useTheme, type Palette } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

/** One icon family (Feather) across the whole product for visual consistency. */
export function Icon({
  name,
  size = 20,
  color,
  tone = 'ink',
}: {
  name: IconName;
  size?: number;
  color?: string;
  tone?: keyof Palette;
}) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors[tone]} accessibilityElementsHidden importantForAccessibility="no" />;
}
