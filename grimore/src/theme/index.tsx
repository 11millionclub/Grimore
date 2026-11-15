import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type Palette } from './colors';
import { fonts, layout, motion, radius, spacing, typeScale } from './tokens';

export * from './colors';
export * from './tokens';

export type Theme = {
  scheme: 'light' | 'dark';
  colors: Palette;
  /** Soft elevation, used sparingly (floating tab bar, sheets). */
  shadow: { card: string; raised: string };
};

function buildTheme(scheme: 'light' | 'dark'): Theme {
  const colors = palettes[scheme];
  return {
    scheme,
    colors,
    shadow: {
      card: `0 1px 2px ${colors.shadow}`,
      raised: `0 10px 30px ${colors.shadow}`,
    },
  };
}

const ThemeContext = createContext<Theme>(buildTheme('light'));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = useMemo(() => buildTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Define styles that depend on the active palette once, outside the
 * component, and get a memoised StyleSheet back.
 */
export function makeStyles<T>(factory: (theme: Theme) => T) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => factory(theme), [theme]);
  };
}

export const tokens = { spacing, radius, fonts, typeScale, motion, layout };
