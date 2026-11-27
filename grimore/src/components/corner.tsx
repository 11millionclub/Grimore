import { Image } from 'expo-image';
import { useEffect, type ComponentType } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import {
  BookOpenIcon,
  CompassIcon,
  FeatherIcon,
  FlagBannerIcon,
  FlowerIcon,
  FlowerTulipIcon,
  KeyIcon,
  LampIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  PenNibIcon,
  QuotesIcon,
  ScrollIcon,
  BookmarkSimpleIcon,
  ButterflyIcon,
  CatIcon,
  CoffeeIcon,
  CrownIcon,
  DiamondIcon,
  FireIcon,
  FlowerLotusIcon,
  GhostIcon,
  HeartIcon,
  LeafIcon,
  MoonIcon,
  PlanetIcon,
  PlantIcon,
  RocketIcon,
  SkullIcon,
  SparkleIcon,
  StarIcon,
  type IconProps,
} from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { Avatar } from '@/components/ui';
import { HOUSE_IDS, houseTokens, type HouseId } from '@/theme/houses';
import { fonts, useTheme } from '@/theme';

import { LibraryScene, type SceneId } from './scene';

type Stops = { offset: number; color: string }[];
type ThemeVisual = { kind: 'linear'; angle: number; stops: Stops; plank: string; animated?: boolean; pattern?: HouseId } | { kind: 'radial'; cx: number; cy: number; stops: Stops; plank: string } | { kind: 'scene'; scene: SceneId; plank: string };

const lin = (angle: number, colors: string[], plank: string, animated?: boolean, pattern?: HouseId): Extract<ThemeVisual, { kind: 'linear' }> => ({
  kind: 'linear',
  angle,
  stops: colors.map((color, i) => ({ offset: i / (colors.length - 1), color })),
  plank,
  animated,
  pattern,
});

/** Visuals for the shop catalogue keys (corner_items). Prices live in the database. */
export const THEMES: Record<string, ThemeVisual> = {
  graphite: lin(160, ['#2a2e33', '#15171a'], '#3a3f46'),
  ember: lin(160, ['#ff6a3d', '#7a2410'], '#5a1d0d'),
  forest: lin(160, ['#2f5d46', '#0f2219'], '#1c3a2b'),
  cobalt: lin(160, ['#2f56d9', '#0d1a4d'], '#142463'),
  plum: lin(160, ['#7b3f6e', '#2a1027'], '#3d1838'),
  ocean: lin(160, ['#1f7a80', '#0a2a30'], '#0f3a40'),
  holo: lin(120, ['#9be7d8', '#c9b6ff', '#ffc6a8', '#b8f0ff'], '#8c8aa8'),
  night: { kind: 'radial', cx: 0.7, cy: 0.2, stops: [{ offset: 0, color: '#3b4a7a' }, { offset: 0.6, color: '#0b0f1f' }, { offset: 1, color: '#0b0f1f' }], plank: '#1f2742' },
  aurora: lin(120, ['#0b1f2a', '#1f7a6b', '#5b3fa8', '#0b1f2a'], '#1b2f3a', true),
  'great-hall': { kind: 'scene', scene: 'great-hall', plank: '#3b2a1e' },
  'dragon-archive': { kind: 'scene', scene: 'dragon-archive', plank: '#3a1a10' },
  'moonlit-reading-room': { kind: 'scene', scene: 'moonlit-reading-room', plank: '#1d2a3a' },
};

type Ring = { stops: Stops } | 'accent' | 'ink' | 'none';
const ring = (colors: string[]): Ring => ({ stops: colors.map((color, i) => ({ offset: i / (colors.length - 1), color })) });
export const FRAMES: Record<string, { ring: Ring; badge?: ComponentType<IconProps>; sigil?: HouseId; orbit?: boolean }> = {
  none: { ring: 'none' },
  ember: { ring: 'accent' },
  ink: { ring: 'ink' },
  aurora: { ring: ring(['#ff6a3d', '#ffd36a', '#9be7d8', '#c9b6ff', '#ff6a3d']) },
  gold: { ring: ring(['#8a6a1f', '#f3d27a', '#8a6a1f', '#f8e7b0', '#8a6a1f']), badge: CrownIcon },
  moon: { ring: ring(['#c9d4ff', '#3b4a7a']), badge: MoonIcon },
  leaves: { ring: ring(['#2f5d46', '#8fd18b', '#2f5d46', '#c9e8a8', '#2f5d46']), badge: LeafIcon },
};

export const SHELVES: Record<string, { stops?: Stops; color?: string; glow?: string; fromTheme?: boolean }> = {
  theme: { fromTheme: true },
  oak: { stops: [{ offset: 0, color: '#8a5a35' }, { offset: 1, color: '#5e3b20' }] },
  white: { stops: [{ offset: 0, color: '#f2f2f0' }, { offset: 1, color: '#cfd0cc' }] },
  marble: { stops: [{ offset: 0, color: '#f4f4f2' }, { offset: 0.3, color: '#d9d9d6' }, { offset: 0.45, color: '#fafaf9' }, { offset: 0.7, color: '#c9c9c6' }, { offset: 1, color: '#efefed' }] },
  neon: { color: '#ff6a3d', glow: '#ff6a3d' },
};

export const NAME_STYLES: Record<string, { stops?: string[] }> = {
  plain: {},
  ember: { stops: ['#ff6a3d', '#ffb36a'] },
  holo: { stops: ['#9be7d8', '#c9b6ff', '#ffc6a8'] },
};

export const PACKS: Record<string, { icons: ComponentType<IconProps>[]; color: string }> = {
  none: { icons: [], color: '' },
  reader: { icons: [BookOpenIcon, CoffeeIcon, BookmarkSimpleIcon, CatIcon], color: '#ffd36a' },
  gothic: { icons: [SkullIcon, GhostIcon, MoonIcon, FireIcon], color: '#e8e4ff' },
  botanic: { icons: [LeafIcon, FlowerLotusIcon, PlantIcon, ButterflyIcon], color: '#bdf0b0' },
  cosmos: { icons: [PlanetIcon, RocketIcon, StarIcon, SparkleIcon], color: '#b8f0ff' },
  royal: { icons: [CrownIcon, DiamondIcon, HeartIcon, SparkleIcon], color: '#ffc6a8' },
};

/* ---------- House items (starter kit and House collection) ---------- */

const sigilIcon = (h: HouseId): ComponentType<IconProps> =>
  function HouseSigilIcon({ size = 24, color = '#000' }: IconProps) {
    return <Sigil house={h} size={Number(size)} color={String(color)} label={false} />;
  };
const HOUSE_OBJECTS: Record<HouseId, ComponentType<IconProps>[]> = {
  wanderers: [CompassIcon, MapTrifoldIcon, ButterflyIcon, LampIcon, StarIcon, MoonIcon],
  weavers: [HeartIcon, FlowerTulipIcon, FlowerIcon, BookmarkSimpleIcon, CoffeeIcon, MoonIcon],
  luminaries: [SparkleIcon, BookOpenIcon, LampIcon, ScrollIcon, QuotesIcon, StarIcon],
  seekers: [KeyIcon, MagnifyingGlassIcon, PenNibIcon, ScrollIcon, FeatherIcon, MoonIcon],
};
const PREMIUM_THEMES: Record<HouseId, [string[], string[]]> = {
  wanderers: [['#1f3a5c', '#0b1726'], ['#e6d7b4', '#152d49']],
  weavers: [['#8a3f28', '#2a120b'], ['#f3d2c4', '#c76849']],
  luminaries: [['#3a2f12', '#14100a'], ['#f6e2a8', '#ddac42']],
  seekers: [['#1d4644', '#0a1716'], ['#d3e7e5', '#3a8884']],
};
for (const h of HOUSE_IDS) {
  const tk = houseTokens[h];
  THEMES[`house-${h}`] = lin(160, [tk.primary, tk.secondary], tk.secondary, false, h);
  THEMES[`house-${h}-premium-a`] = lin(170, PREMIUM_THEMES[h][0], PREMIUM_THEMES[h][0][1], false, h);
  THEMES[`house-${h}-premium-b`] = lin(140, PREMIUM_THEMES[h][1], PREMIUM_THEMES[h][1][1], true, h);
  FRAMES[`house-${h}`] = { ring: ring([tk.primary, tk.secondary, tk.primary]), sigil: h };
  FRAMES[`house-${h}-animated`] = { ring: ring([tk.primary, tk.secondary, tk.primary]), sigil: h, orbit: true };
  NAME_STYLES[`house-${h}`] = { stops: [tk.inkDark, tk.secondary] };
  PACKS[`house-${h}`] = { icons: [sigilIcon(h), FlagBannerIcon, ...HOUSE_OBJECTS[h].slice(0, 2)], color: tk.primary };
  PACKS[`house-${h}-premium`] = { icons: [sigilIcon(h), ...HOUSE_OBJECTS[h], FlagBannerIcon, SparkleIcon, CrownIcon, DiamondIcon, LeafIcon], color: tk.secondary };
  PACKS[`house-${h}-bundle`] = PACKS[`house-${h}-premium`];
}

/** `banner_url`: a paid community's banner worn instead of the theme. */
export type CornerLook = { theme: string; frame: string; shelf: string; name_style: string; pack: string; banner_url?: string | null };
export const DEFAULT_LOOK: CornerLook = { theme: 'forest', frame: 'ember', shelf: 'theme', name_style: 'plain', pack: 'reader' };

const vec = (angle: number) => {
  const r = ((angle - 90) * Math.PI) / 180;
  return { x1: 0.5 - Math.cos(r) / 2, y1: 0.5 - Math.sin(r) / 2, x2: 0.5 + Math.cos(r) / 2, y2: 0.5 + Math.sin(r) / 2 };
};

/** A full-bleed gradient (or illustrated library) behind a block. */
export function ThemeFill({ theme, style }: { theme: string; style?: StyleProp<ViewStyle> }) {
  const t = THEMES[theme] ?? THEMES.forest;
  const shift = useSharedValue(0);
  const animated = t.kind === 'linear' && t.animated;
  useEffect(() => {
    if (animated) shift.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1, true);
  }, [animated, shift]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: `${-shift.value * 66}%` }] }));
  if (t.kind === 'scene') return <LibraryScene id={t.scene} style={[{ position: 'absolute', inset: 0 }, style]} />;
  const id = `th-${theme}`;
  const svg = (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        {t.kind === 'linear' ? (
          <LinearGradient id={id} {...vec(t.angle)}>
            {t.stops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        ) : (
          <RadialGradient id={id} cx={t.cx} cy={t.cy} r={0.9}>
            {t.stops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </RadialGradient>
        )}
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
  const pattern = t.kind === 'linear' && t.pattern ? <SigilPattern house={t.pattern} /> : null;
  if (!animated)
    return (
      <View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, style]}>
        {svg}
        {pattern}
      </View>
    );
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', inset: 0, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ width: '300%', height: '100%' }, slide]}>{svg}</Animated.View>
      {pattern}
    </View>
  );
}

/** A quiet grid of the House sigil over a banner. */
function SigilPattern({ house }: { house: HouseId }) {
  const tk = houseTokens[house];
  const cells = Array.from({ length: 24 }, (_, i) => i);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, flexDirection: 'row', flexWrap: 'wrap', opacity: 0.14, overflow: 'hidden' }}>
      {cells.map((i) => (
        <View key={i} style={{ width: '16.66%', height: 64, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: i % 2 ? 18 : 0 }] }}>
          <Sigil house={house} size={26} color={tk.onPrimary} label={false} />
        </View>
      ))}
    </View>
  );
}

export function Banner({ look, height = 190, children }: { look: CornerLook; height?: number; children?: React.ReactNode }) {
  const pack = PACKS[look.pack] ?? PACKS.none;
  const spots = [
    { left: '56%', top: '40%', rot: '-12deg', size: 30 },
    { left: '72%', top: '60%', rot: '10deg', size: 24 },
    { left: '84%', top: '42%', rot: '18deg', size: 20 },
    { left: '62%', top: '72%', rot: '-6deg', size: 26 },
  ] as const;
  return (
    <View style={{ height, overflow: 'hidden' }}>
      {look.banner_url ? <Image source={{ uri: look.banner_url }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : <ThemeFill theme={look.theme} />}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.12)' }} />
      {pack.icons.map((Icon, i) => (
        <View key={i} pointerEvents="none" style={{ position: 'absolute', left: spots[i].left, top: spots[i].top, transform: [{ rotate: spots[i].rot }] }}>
          <Icon size={spots[i].size} weight="fill" color={pack.color} />
        </View>
      ))}
      {children}
    </View>
  );
}

function RingFill({ r, size }: { r: Ring; size: number }) {
  const { colors } = useTheme();
  if (r === 'none') return <View style={{ position: 'absolute', inset: 0, borderRadius: size, backgroundColor: colors.bg }} />;
  if (r === 'accent' || r === 'ink') return <View style={{ position: 'absolute', inset: 0, borderRadius: size, backgroundColor: r === 'accent' ? colors.accent : colors.ink }} />;
  return (
    <View style={{ position: 'absolute', inset: 0, borderRadius: size, overflow: 'hidden' }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`ring-${size}-${r.stops.length}-${r.stops[1]?.color}`} x1="0" y1="0" x2="1" y2="1">
            {r.stops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#ring-${size}-${r.stops.length}-${r.stops[1]?.color})`} />
      </Svg>
    </View>
  );
}

export function FramedAvatar({ frame, uri, name, size = 92 }: { frame: string; uri?: string | null; name?: string | null; size?: number }) {
  const { colors } = useTheme();
  const f = FRAMES[frame] ?? FRAMES.ember;
  const Badge = f.badge;
  const outer = size + 18;
  return (
    <View style={{ width: outer, height: outer, borderRadius: outer / 2, backgroundColor: colors.bg, padding: 3 }}>
      <View style={{ flex: 1, borderRadius: outer / 2, padding: 3 }}>
        <RingFill r={f.ring} size={outer} />
        <View style={{ flex: 1, borderRadius: outer / 2, backgroundColor: colors.bg, padding: 3, alignItems: 'center', justifyContent: 'center' }}>
          <Avatar uri={uri} name={name} size={size} />
        </View>
      </View>
      {f.sigil && !f.orbit ? (
        <View style={{ position: 'absolute', alignSelf: 'center', bottom: -6, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: colors.bg, backgroundColor: houseTokens[f.sigil].primary, alignItems: 'center', justifyContent: 'center' }}>
          <Sigil house={f.sigil} size={16} color={houseTokens[f.sigil].onPrimary} label={false} />
        </View>
      ) : null}
      {f.sigil && f.orbit ? <OrbitingSigil house={f.sigil} radius={outer / 2} /> : null}
      {Badge ? (
        <View style={{ position: 'absolute', right: 0, bottom: 4, width: 28, height: 28, borderRadius: 14, borderWidth: 4, borderColor: colors.bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <RingFill r={f.ring} size={28} />
          <Badge size={13} weight="fill" color="#000" />
        </View>
      ) : null}
    </View>
  );
}

/** The animated House frame: the sigil circles the avatar slowly (still with reduced motion). */
function OrbitingSigil({ house, radius }: { house: HouseId; radius: number }) {
  const { colors } = useTheme();
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1);
  }, [turn]);
  const style = useAnimatedStyle(() => {
    const a = turn.value * Math.PI * 2 + Math.PI / 2;
    return { transform: [{ translateX: Math.cos(a) * (radius - 4) }, { translateY: Math.sin(a) * (radius - 4) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: radius - 14, top: radius - 14, width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: colors.bg, backgroundColor: houseTokens[house].primary, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Sigil house={house} size={14} color={houseTokens[house].onPrimary} label={false} />
    </Animated.View>
  );
}

/** The reader's name, optionally in a gradient (drawn with SVG text). */
export function StyledName({ name, style: nameStyle, size = 26, serif, centered }: { name: string; style: string; size?: number; serif?: boolean; centered?: boolean }) {
  const { colors } = useTheme();
  const s = NAME_STYLES[nameStyle]?.stops;
  const width = Math.max(40, Math.round(name.length * size * (serif ? 0.6 : 0.76)));
  const height = Math.round(size * 1.3);
  const id = `name-${nameStyle}`;
  return (
    <Svg width={width} height={height} accessibilityLabel={name}>
      {s ? (
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            {s.map((c, i) => (
              <Stop key={c} offset={i / (s.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
      ) : null}
      <SvgText x={centered ? width / 2 : 0} y={size} textAnchor={centered ? 'middle' : 'start'} fontFamily={serif ? fonts.serifBold : fonts.bold} fontSize={size} fill={s ? `url(#${id})` : colors.ink}>
        {name}
      </SvgText>
    </Svg>
  );
}

export function Plank({ shelf, theme, height = 10 }: { shelf: string; theme: string; height?: number }) {
  const s = SHELVES[shelf] ?? SHELVES.theme;
  const plank = (THEMES[theme] ?? THEMES.forest).plank;
  const id = `plank-${shelf}`;
  return (
    <View
      style={{
        height,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: s.fromTheme ? plank : s.color ?? '#5e3b20',
        shadowColor: s.glow ?? '#000',
        shadowOpacity: s.glow ? 0.9 : 0.35,
        shadowRadius: s.glow ? 12 : 6,
        shadowOffset: { width: 0, height: s.glow ? 0 : 6 },
        elevation: 3,
      }}
    >
      {s.stops ? (
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2={shelf === 'marble' ? '1' : '0'} y2="1">
              {s.stops.map((st) => (
                <Stop key={st.offset} offset={st.offset} stopColor={st.color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}
