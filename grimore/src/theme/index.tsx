import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useAppearance } from '@/stores/appearance';

import { palettes, type Palette } from './colors';
import { fonts, layout, motion, radius, spacing, typeScale } from './tokens';

export * from './colors';
export * from './tokens';

export type Theme = {
  scheme: 'light' | 'dark';
  colors: Palette;
};

const ThemeContext = createContext<Theme>({ scheme: 'dark', colors: palettes.dark });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const appearance = useAppearance((s) => s.appearance);
  const scheme = appearance === 'system' ? (system === 'light' ? 'light' : 'dark') : appearance;
  const theme = useMemo<Theme>(() => ({ scheme, colors: palettes[scheme] }), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Forces the dark palette for a subtree (camera, Wrapped). */
export function DarkTheme({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={DARK}>{children}</ThemeContext.Provider>;
}
const DARK: Theme = { scheme: 'dark', colors: palettes.dark };

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Palette-dependent styles defined once, memoised per theme. */
export function makeStyles<T>(factory: (theme: Theme) => T) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => factory(theme), [theme]);
  };
}

export const tokens = { spacing, radius, fonts, typeScale, motion, layout };
