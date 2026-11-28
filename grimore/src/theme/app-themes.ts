import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { palettes, type Palette } from './colors';

/** A few colours are enough to describe a theme; the rest is derived. */
type Base = { bg: string; surface: string; surface2: string; surface3: string; ink: string; muted: string; faint: string; accent: string; onAccent: string; gold: string; good: string; danger: string; dark: boolean };

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const rgba = (hex: string, a: number) => `rgba(${hexToRgb(hex).join(',')},${a})`;

function build(b: Base): Palette {
  return {
    bg: b.bg,
    surface: b.surface,
    surface2: b.surface2,
    surface3: b.surface3,
    line: rgba(b.ink, b.dark ? 0.12 : 0.1),
    lineStrong: rgba(b.ink, b.dark ? 0.26 : 0.22),
    ink: b.ink,
    muted: b.muted,
    faint: b.faint,
    accent: b.accent,
    accentSoft: rgba(b.accent, b.dark ? 0.14 : 0.1),
    onAccent: b.onAccent,
    gold: b.gold,
    goldSoft: rgba(b.gold, 0.18),
    good: b.good,
    goodSoft: rgba(b.good, 0.12),
    danger: b.danger,
    glass: rgba(b.surface, 0.95),
    glassEdge: rgba(b.ink, 0.08),
    scrim: b.dark ? 'rgba(0,0,0,0.6)' : rgba(b.ink, 0.45),
    shadow: b.dark ? 'rgba(0,0,0,0.55)' : rgba(b.ink, 0.14),
  };
}

export type AppThemeId = 'ivory' | 'midnight' | 'paper' | 'slate' | 'parchment' | 'forest' | 'rose' | 'velvet' | 'academia' | 'celestial' | 'emerald';
export type AppTheme = { id: AppThemeId; name: string; paid: boolean; scheme: 'light' | 'dark'; colors: Palette };

/** Colours of the floating tab bar for a theme. Ivory keeps the original walnut and gold. */
export type BarColors = { bg: string; edge: string; active: string; idle: string; seal: string; sealEdge: string; sealIcon: string; dot: string };
const WALNUT: BarColors = { bg: 'rgba(28,19,13,0.97)', edge: 'rgba(198,154,67,0.65)', active: '#E8D19B', idle: 'rgba(242,233,216,0.55)', seal: '#54202A', sealEdge: '#C69A43', sealIcon: '#E8D19B', dot: '#C69A43' };
export function barColors(t: AppTheme): BarColors {
  if (t.id === 'ivory') return WALNUT;
  const c = t.colors;
  const dark = t.scheme === 'dark';
  return {
    bg: rgba(c.surface, 0.97),
    edge: rgba(c.gold, 0.65),
    active: dark ? c.gold : c.accent,
    idle: rgba(c.ink, 0.55),
    seal: c.accent,
    sealEdge: c.gold,
    sealIcon: c.onAccent,
    dot: c.gold,
  };
}

/** Six free themes (two of them plain and simple) and five paid ones (open to everyone while paywalls are off). */
export const APP_THEMES: AppTheme[] = [
  { id: 'ivory', name: 'Ivory', paid: false, scheme: 'light', colors: palettes.light },
  { id: 'midnight', name: 'Midnight', paid: false, scheme: 'dark', colors: palettes.dark },
  // Simple themes: plain, quiet colours with no tinted paper.
  {
    id: 'paper',
    name: 'Paper',
    paid: false,
    scheme: 'light',
    colors: build({ bg: '#FAFAF8', surface: '#FFFFFF', surface2: '#F1F1EE', surface3: '#E4E4E0', ink: '#1C1C1A', muted: '#5F5F5A', faint: '#9A9A94', accent: '#2F2F2C', onAccent: '#FFFFFF', gold: '#A8873F', good: '#2F6B45', danger: '#B3261E', dark: false }),
  },
  {
    id: 'slate',
    name: 'Slate',
    paid: false,
    scheme: 'dark',
    colors: build({ bg: '#141518', surface: '#1D1F23', surface2: '#26292E', surface3: '#33373D', ink: '#ECEDEF', muted: '#A9ADB4', faint: '#70757D', accent: '#E3E5E8', onAccent: '#141518', gold: '#C9A961', good: '#8FC79F', danger: '#F2958C', dark: true }),
  },
  {
    id: 'parchment',
    name: 'Parchment',
    paid: false,
    scheme: 'light',
    colors: build({ bg: '#EDE0C4', surface: '#F7EEDB', surface2: '#E4D4B2', surface3: '#D4BF96', ink: '#2A1B0E', muted: '#6E5638', faint: '#A08A69', accent: '#6B3A1A', onAccent: '#F7EEDB', gold: '#9C7428', good: '#3E5A2E', danger: '#9E2F22', dark: false }),
  },
  {
    id: 'forest',
    name: 'Forest',
    paid: false,
    scheme: 'light',
    colors: build({ bg: '#E6ECE2', surface: '#F5F8F1', surface2: '#D9E2D2', surface3: '#C3D0BA', ink: '#13211A', muted: '#4D5F53', faint: '#8A9A8E', accent: '#263C30', onAccent: '#EEF3EA', gold: '#9A7B2F', good: '#2F5E3E', danger: '#A3302A', dark: false }),
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    paid: true,
    scheme: 'light',
    colors: build({ bg: '#F5E6E7', surface: '#FFF7F7', surface2: '#ECD6D8', surface3: '#DDBFC2', ink: '#2B1418', muted: '#7A5A60', faint: '#B0959A', accent: '#8C4A57', onAccent: '#FFF7F7', gold: '#B0864A', good: '#4D6A4F', danger: '#A3302A', dark: false }),
  },
  {
    id: 'velvet',
    name: 'Burgundy Velvet',
    paid: true,
    scheme: 'dark',
    colors: build({ bg: '#1A0A0F', surface: '#2A1118', surface2: '#3A1922', surface3: '#52242F', ink: '#F5E6E8', muted: '#D2AEB5', faint: '#9A7880', accent: '#E8C38E', onAccent: '#1A0A0F', gold: '#D6A85A', good: '#9CC0A4', danger: '#F0928A', dark: true }),
  },
  {
    id: 'academia',
    name: 'Dark Academia',
    paid: true,
    scheme: 'dark',
    colors: build({ bg: '#15120E', surface: '#211C16', surface2: '#2C261D', surface3: '#3E3528', ink: '#EDE3D1', muted: '#BFB094', faint: '#857860', accent: '#C9A45C', onAccent: '#15120E', gold: '#C9A45C', good: '#8FAF8A', danger: '#E08A7E', dark: true }),
  },
  {
    id: 'celestial',
    name: 'Celestial',
    paid: true,
    scheme: 'dark',
    colors: build({ bg: '#0B1022', surface: '#141B34', surface2: '#1C2546', surface3: '#2A345C', ink: '#E9ECF8', muted: '#AEB6D4', faint: '#727CA0', accent: '#E6CF8A', onAccent: '#0B1022', gold: '#E6CF8A', good: '#9CC7B8', danger: '#F09A8E', dark: true }),
  },
  {
    id: 'emerald',
    name: 'Emerald Gilt',
    paid: true,
    scheme: 'dark',
    colors: build({ bg: '#0A1712', surface: '#11241B', surface2: '#183126', surface3: '#234536', ink: '#EAF3EC', muted: '#AFC7B7', faint: '#6F8C7A', accent: '#D8B66C', onAccent: '#0A1712', gold: '#D8B66C', good: '#9BD1AE', danger: '#F09A8E', dark: true }),
  },
];

export const appTheme = (id: string | null | undefined) => APP_THEMES.find((t) => t.id === id) ?? APP_THEMES[0];

/** The chosen theme, kept on the device so the app opens in it straight away; the account keeps a copy. */
export const useAppTheme = create<{ id: AppThemeId; set: (id: AppThemeId) => void }>()(
  persist((set) => ({ id: 'ivory', set: (id) => set({ id }) }), { name: 'grimore-app-theme', storage: createJSONStorage(() => AsyncStorage) }),
);
