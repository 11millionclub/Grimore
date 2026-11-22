import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { palettes, type Palette } from './colors';
import { fonts, layout, motion, radius, spacing, typeScale } from './tokens';

export * from './colors';
export * from './tokens';

export type Theme = {
  scheme: 'light' | 'dark';
  colors: Palette;
};

const IVORY: Theme = { scheme: 'light', colors: palettes.light };
const ThemeContext = createContext<Theme>(IVORY);

/** One light look across the app. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={IVORY}>{children}</ThemeContext.Provider>;
}

/** Lamplight palette for a subtree that needs a dark surround (camera). */
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
