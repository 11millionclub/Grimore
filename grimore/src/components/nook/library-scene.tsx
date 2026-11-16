import { memo, type ReactElement } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Glyph } from '@/components/ornaments';
import { seededRandom } from '@/utils/hash';

/**
 * Original illustrated libraries, drawn in SVG so they are ours to ship, stay
 * crisp at any size and weigh almost nothing. Each scene is a 400×600 canvas
 * scaled with "slice" so it fills any header or full-screen background.
 */

export const SCENES = {
  'great-hall': { label: 'Great Hall', description: 'Oak shelves and a moonlit gothic window' },
  'candlelit-study': { label: 'Candlelit Study', description: 'A writing desk by candlelight' },
  'wizard-tower': { label: 'Wizard’s Tower', description: 'Starlight and floating tomes' },
  'dragon-archive': { label: 'Dragon’s Archive', description: 'Embers, gold and something sleeping' },
  'elven-library': { label: 'Elven Library', description: 'Green light through living arches' },
  'moonlit-reading-room': { label: 'Moonlit Reading Room', description: 'Blue night and a quiet armchair' },
} as const;
export type SceneId = keyof typeof SCENES;
export const SCENE_IDS = Object.keys(SCENES) as SceneId[];

type Palette = {
  wallTop: string;
  wallBottom: string;
  wood: string;
  woodDark: string;
  back: string;
  spines: string[];
  sky: [string, string];
  glow: string;
  floor: string;
};

const W = 400;
const H = 600;

const palettes: Record<SceneId, Palette> = {
  'great-hall': {
    wallTop: '#3B2A1E', wallBottom: '#1E150F', wood: '#6B4628', woodDark: '#3E2817', back: '#24180F',
    spines: ['#6E2333', '#2F4A3A', '#26344F', '#8E6B33', '#5B3A2A', '#B9A47F', '#4B2E44', '#7B4A36'],
    sky: ['#1B2440', '#3A4D7A'], glow: '#F2D7A0', floor: '#1A120C',
  },
  'candlelit-study': {
    wallTop: '#2A1D15', wallBottom: '#120C08', wood: '#5C3D27', woodDark: '#2F1E12', back: '#1B120C',
    spines: ['#7A2C2C', '#3B4A32', '#2C3550', '#9B7A3E', '#4A3328', '#C0A57A', '#5A2E3E'],
    sky: ['#131826', '#232C44'], glow: '#FFC874', floor: '#100A06',
  },
  'wizard-tower': {
    wallTop: '#1C1838', wallBottom: '#0C0A1C', wood: '#3D2F55', woodDark: '#221A35', back: '#141029',
    spines: ['#5B3C8C', '#2E5B7A', '#8C3B6B', '#B89A4E', '#3A6B5A', '#C9B6E4', '#2C2F6B'],
    sky: ['#0D0B24', '#2B2563'], glow: '#C9B6FF', floor: '#08061A',
  },
  'dragon-archive': {
    wallTop: '#2A1410', wallBottom: '#0D0605', wood: '#4A2618', woodDark: '#24110A', back: '#170A07',
    spines: ['#7A1F1F', '#3B2A1C', '#8E6B33', '#5E3A1E', '#C79B47', '#2E2A26', '#6B2A3A'],
    sky: ['#220A06', '#5E1E0F'], glow: '#FF9A4A', floor: '#0A0403',
  },
  'elven-library': {
    wallTop: '#2D3B2C', wallBottom: '#141C14', wood: '#5D6B48', woodDark: '#33402A', back: '#1B241A',
    spines: ['#3F6B4A', '#8DA76B', '#C9B77E', '#5A7B8C', '#7A5A3A', '#E3D9B5', '#4B5E3A'],
    sky: ['#A9C7B0', '#E8F0D8'], glow: '#F4F7D9', floor: '#121811',
  },
  'moonlit-reading-room': {
    wallTop: '#1A2236', wallBottom: '#0A0E18', wood: '#33405C', woodDark: '#1C2436', back: '#111727',
    spines: ['#3A5584', '#6E2333', '#C2B48C', '#2F4A3A', '#5A6E9A', '#8C8FA8', '#4B3A5E'],
    sky: ['#0E1630', '#2E4580'], glow: '#DCE6FF', floor: '#080B14',
  },
};

function bookcase(key: string, x: number, y: number, w: number, h: number, rows: number, p: Palette, seed: number): ReactElement {
  const rand = seededRandom(seed);
  const rowH = h / rows;
  const out: ReactElement[] = [
    <Rect key={`${key}-frame`} x={x - 6} y={y - 8} width={w + 12} height={h + 14} fill={p.woodDark} />,
    <Rect key={`${key}-back`} x={x} y={y} width={w} height={h} fill={p.back} />,
  ];
  for (let r = 0; r < rows; r += 1) {
    const base = y + (r + 1) * rowH;
    let cx = x + 3;
    let i = 0;
    while (cx < x + w - 10) {
      const bw = 6 + Math.floor(rand() * 9);
      const bh = rowH * (0.55 + rand() * 0.32);
      const color = p.spines[Math.floor(rand() * p.spines.length)];
      if (rand() < 0.06) {
        cx += bw + 4; // a gap on the shelf
        continue;
      }
      const lean = rand() < 0.07 && cx + bw + 14 < x + w ? -10 - rand() * 10 : 0;
      out.push(
        <G key={`${key}-${r}-${i}`} rotation={lean} origin={`${cx + bw},${base - 4}`}>
          <Rect x={cx} y={base - 4 - bh} width={bw} height={bh} fill={color} rx={0.8} />
          <Rect x={cx} y={base - 4 - bh + 4} width={bw} height={1.2} fill="#E9C77A" opacity={0.55} />
          <Rect x={cx} y={base - 4 - 7} width={bw} height={1.2} fill="#E9C77A" opacity={0.4} />
          <Rect x={cx} y={base - 4 - bh} width={1.4} height={bh} fill="#000" opacity={0.18} />
        </G>,
      );
      cx += bw + (lean ? 8 : 0.8);
      i += 1;
    }
    out.push(<Rect key={`${key}-plank-${r}`} x={x - 6} y={base - 4} width={w + 12} height={6} fill={p.wood} />);
    out.push(<Rect key={`${key}-plankshadow-${r}`} x={x} y={base + 2} width={w} height={3} fill="#000" opacity={0.35} />);
  }
  return <G key={key}>{out}</G>;
}

/** Pointed gothic window with mullions, a tracery rose and a night (or day) sky. */
function gothicWindow(key: string, x: number, y: number, w: number, h: number, p: Palette, opts: { moon?: boolean; stars?: number; seed?: number; prefix: string }): ReactElement {
  const arch = `M${x} ${y + h} L${x} ${y + w * 0.62} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + w * 0.62} L${x + w} ${y + h} Z`;
  const rand = seededRandom(opts.seed ?? 7);
  const stars = Array.from({ length: opts.stars ?? 0 }, (_, i) => (
    <Circle key={`${key}-s${i}`} cx={x + 6 + rand() * (w - 12)} cy={y + 14 + rand() * (h * 0.55)} r={0.6 + rand() * 1.1} fill="#FFFFFF" opacity={0.5 + rand() * 0.5} />
  ));
  return (
    <G key={key}>
      <Path d={arch} fill={`url(#${opts.prefix}-${key}-sky)`} />
      {stars}
      {opts.moon ? <Circle cx={x + w * 0.68} cy={y + w * 0.5} r={w * 0.13} fill="#F4EBD0" opacity={0.95} /> : null}
      <Path d={arch} fill="none" stroke={p.woodDark} strokeWidth={7} />
      <Line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h} stroke={p.woodDark} strokeWidth={4} />
      <Line x1={x} y1={y + h * 0.55} x2={x + w} y2={y + h * 0.55} stroke={p.woodDark} strokeWidth={3} />
      <Line x1={x} y1={y + h * 0.8} x2={x + w} y2={y + h * 0.8} stroke={p.woodDark} strokeWidth={3} />
      <Circle cx={x + w / 2} cy={y + w * 0.42} r={w * 0.17} fill="none" stroke={p.woodDark} strokeWidth={3} />
    </G>
  );
}

function candle(key: string, x: number, y: number, h: number, glow: string, prefix: string): ReactElement {
  return (
    <G key={key}>
      <Circle cx={x} cy={y - 6} r={34} fill={`url(#${prefix}-candleGlow)`} />
      <Rect x={x - 3.5} y={y} width={7} height={h} fill="#EFE4CC" rx={1} />
      <Path d={`M${x} ${y - 13} Q${x + 4.5} ${y - 5} ${x} ${y - 1} Q${x - 4.5} ${y - 5} ${x} ${y - 13} Z`} fill={glow} />
      <Ellipse cx={x} cy={y - 5} rx={1.5} ry={3} fill="#FFFFFF" opacity={0.8} />
    </G>
  );
}

function SceneSvg({ id }: { id: SceneId }) {
  const p = palettes[id];
  const layers: ReactElement[] = [];

  switch (id) {
    case 'great-hall':
      layers.push(gothicWindow('win', 140, 40, 120, 300, p, { moon: true, stars: 22, seed: 3, prefix: id }));
      layers.push(bookcase('l', 8, 30, 118, 470, 6, p, 11));
      layers.push(bookcase('r', 274, 30, 118, 470, 6, p, 29));
      layers.push(<Rect key="rail" x={0} y={0} width={W} height={14} fill={p.woodDark} />);
      layers.push(<Path key="beam" d={`M140 340 L260 340 L330 600 L70 600 Z`} fill={p.glow} opacity={0.07} />);
      layers.push(candle('c1', 160, 372, 22, p.glow, id), candle('c2', 200, 362, 30, p.glow, id), candle('c3', 240, 372, 22, p.glow, id));
      layers.push(<Rect key="table" x={130} y={394} width={140} height={10} fill={p.wood} />);
      // library ladder
      layers.push(<Line key="lad1" x1={300} y1={130} x2={334} y2={520} stroke={p.wood} strokeWidth={4} />, <Line key="lad2" x1={326} y1={124} x2={360} y2={516} stroke={p.wood} strokeWidth={4} />);
      for (let i = 0; i < 9; i += 1) layers.push(<Line key={`rung${i}`} x1={304 + i * 3.4} y1={170 + i * 40} x2={330 + i * 3.4} y2={166 + i * 40} stroke={p.wood} strokeWidth={3} />);
      break;
    case 'candlelit-study':
      layers.push(bookcase('back', 20, 40, 360, 330, 4, p, 5));
      layers.push(<Circle key="halo" cx={200} cy={440} r={210} fill={`url(#${id}-warm)`} />);
      layers.push(<Rect key="desk" x={40} y={440} width={320} height={16} fill={p.wood} />, <Rect key="deskfront" x={56} y={456} width={288} height={150} fill={p.woodDark} />);
      layers.push(<Path key="book" d="M140 438 Q170 420 200 432 Q230 420 260 438 L260 442 L140 442 Z" fill="#F1E6CC" />, <Line key="spine" x1={200} y1={432} x2={200} y2={442} stroke="#B9A47F" strokeWidth={1} />);
      layers.push(candle('c1', 96, 404, 36, p.glow, id), candle('c2', 312, 412, 28, p.glow, id), candle('c3', 330, 418, 22, p.glow, id));
      layers.push(<Path key="quill" d="M270 438 Q300 380 330 350 Q305 395 276 440 Z" fill="#E9DFC8" opacity={0.9} />);
      break;
    case 'wizard-tower': {
      layers.push(<Circle key="rose" cx={200} cy={170} r={92} fill={`url(#${id}-win-sky)`} />);
      const rand = seededRandom(91);
      for (let i = 0; i < 40; i += 1) {
        const a = rand() * Math.PI * 2;
        const d = rand() * 84;
        layers.push(<Circle key={`st${i}`} cx={200 + Math.cos(a) * d} cy={170 + Math.sin(a) * d} r={0.6 + rand()} fill="#FFFFFF" opacity={0.4 + rand() * 0.6} />);
      }
      layers.push(<Circle key="moon" cx={226} cy={150} r={28} fill="#F2E9D0" />, <Circle key="moonbite" cx={240} cy={141} r={25} fill={p.sky[0]} />);
      layers.push(<Circle key="roseframe" cx={200} cy={170} r={92} fill="none" stroke={p.woodDark} strokeWidth={9} />);
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        layers.push(<Line key={`spoke${i}`} x1={200} y1={170} x2={200 + Math.cos(a) * 92} y2={170 + Math.sin(a) * 92} stroke={p.woodDark} strokeWidth={2.5} />);
      }
      layers.push(bookcase('l', 6, 290, 150, 290, 4, p, 17), bookcase('r', 244, 290, 150, 290, 4, p, 23));
      // floating tomes and sparkles
      const floaters = [[120, 300, -18, '#5B3C8C'], [290, 268, 14, '#B89A4E'], [210, 320, 6, '#2E5B7A']] as const;
      floaters.forEach(([fx, fy, rot, c], i) =>
        layers.push(
          <G key={`fl${i}`} rotation={rot} origin={`${fx},${fy}`}>
            <Rect x={fx - 22} y={fy - 6} width={44} height={12} fill={c} rx={1.5} />
            <Rect x={fx - 20} y={fy - 4} width={40} height={2} fill="#F2E9D0" opacity={0.85} />
          </G>,
        ),
      );
      for (let i = 0; i < 14; i += 1) layers.push(<Path key={`sp${i}`} d={`M${60 + rand() * 280} ${240 + rand() * 120} l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 Z`} fill={p.glow} opacity={0.35 + rand() * 0.5} />);
      break;
    }
    case 'dragon-archive':
      layers.push(gothicWindow('win', 110, 50, 180, 300, p, { stars: 0, seed: 2, prefix: id }));
      layers.push(bookcase('l', 6, 80, 96, 420, 5, p, 41), bookcase('r', 298, 80, 96, 420, 5, p, 43));
      layers.push(<Ellipse key="ember" cx={200} cy={560} rx={260} ry={120} fill={`url(#${id}-warm)`} />);
      // the hoard
      {
        const rand = seededRandom(5);
        for (let i = 0; i < 70; i += 1) {
          layers.push(<Ellipse key={`coin${i}`} cx={90 + rand() * 220} cy={520 + rand() * 60} rx={4 + rand() * 3} ry={2 + rand() * 1.2} fill={rand() > 0.3 ? '#D9A845' : '#A97B2E'} opacity={0.75 + rand() * 0.25} />);
        }
      }
      layers.push(<Path key="chest" d="M150 500 L250 500 L250 540 L150 540 Z M150 500 Q200 470 250 500" fill="#4A2618" stroke="#C79B47" strokeWidth={2} />);
      break;
    case 'elven-library':
      layers.push(gothicWindow('w1', 40, 50, 90, 240, p, { seed: 1, prefix: id }), gothicWindow('w2', 155, 30, 90, 260, p, { seed: 2, prefix: id }), gothicWindow('w3', 270, 50, 90, 240, p, { seed: 4, prefix: id }));
      layers.push(bookcase('base', 14, 320, 372, 250, 3, p, 61));
      layers.push(<Path key="beam" d="M155 290 L245 290 L320 600 L80 600 Z" fill={p.glow} opacity={0.1} />);
      {
        const rand = seededRandom(13);
        const vines = ['M30 0 C60 80 10 160 40 240 S20 360 36 420', 'M370 0 C340 90 392 170 360 260 S384 360 366 430', 'M200 0 C230 30 170 40 200 30'];
        vines.forEach((d, i) => layers.push(<Path key={`vine${i}`} d={d} stroke="#4B6B3A" strokeWidth={3} fill="none" />));
        for (let i = 0; i < 46; i += 1) {
          const side = i % 2 === 0;
          const vx = side ? 20 + rand() * 45 : 345 + rand() * 45;
          const vy = rand() * 430;
          layers.push(<Ellipse key={`leaf${i}`} cx={vx} cy={vy} rx={7} ry={3.2} fill={rand() > 0.5 ? '#6E9A55' : '#8DB46C'} rotation={rand() * 180} origin={`${vx},${vy}`} opacity={0.9} />);
        }
      }
      break;
    case 'moonlit-reading-room':
      layers.push(gothicWindow('w1', 60, 50, 110, 280, p, { moon: true, stars: 18, seed: 8, prefix: id }), gothicWindow('w2', 230, 50, 110, 280, p, { stars: 18, seed: 9, prefix: id }));
      layers.push(<Polygon key="beam1" points="60,330 170,330 260,600 20,600" fill={p.glow} opacity={0.08} />, <Polygon key="beam2" points="230,330 340,330 400,600 200,600" fill={p.glow} opacity={0.06} />);
      layers.push(bookcase('base', 10, 360, 380, 160, 2, p, 71));
      // armchair silhouette
      layers.push(
        <Path key="chair" d="M120 600 L120 520 Q120 470 160 470 L240 470 Q280 470 280 520 L280 600 Z M100 540 Q100 520 120 520 L120 600 L100 600 Z M280 520 Q300 520 300 540 L300 600 L280 600 Z" fill="#0B0F1C" />,
      );
      break;
  }

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.wallTop} />
          <Stop offset="1" stopColor={p.wallBottom} />
        </LinearGradient>
        {['win', 'w1', 'w2', 'w3'].map((k) => (
          <LinearGradient key={k} id={`${id}-${k}-sky`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.sky[0]} />
            <Stop offset="1" stopColor={p.sky[1]} />
          </LinearGradient>
        ))}
        <RadialGradient id={`${id}-candleGlow`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={p.glow} stopOpacity={0.45} />
          <Stop offset="1" stopColor={p.glow} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}-warm`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={p.glow} stopOpacity={0.28} />
          <Stop offset="1" stopColor={p.glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill={`url(#${id}-wall)`} />
      <Rect x={0} y={H - 40} width={W} height={40} fill={p.floor} />
      {layers}
    </Svg>
  );
}

const MemoScene = memo(SceneSvg);

/** A library scene that fills its container. Optional dragon for the archive. */
export function LibraryScene({ id, style, children }: { id: SceneId; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  return (
    <View style={[{ overflow: 'hidden' }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <MemoScene id={SCENES[id] ? id : 'great-hall'} />
      </View>
      {id === 'dragon-archive' ? (
        <View style={{ position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center', opacity: 0.55 }}>
          <Glyph name="dragon" size={110} color="#1A0705" />
        </View>
      ) : null}
      {children}
    </View>
  );
}
