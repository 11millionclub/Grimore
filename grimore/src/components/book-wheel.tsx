import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, Line, LinearGradient, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

import { fonts, GILT } from '@/theme';
import { hash, spineTitle } from '@/utils/sagas';

/** Dark grounds for the wedges: burgundy, forest, walnut, midnight, plum and smoke. */
const GROUNDS = [
  ['#3a1219', '#170a0c'],
  ['#1d2e24', '#0b120e'],
  ['#3a2516', '#150d08'],
  ['#1a1f33', '#0a0c14'],
  ['#2f1a33', '#120a14'],
  ['#2a2622', '#100e0c'],
] as const;

/** Small gilt emblems for books without a cover: crown, moon, rose, sword, feather, star, tower, raven. */
const MOTIFS: ((s: number) => string)[] = [
  (s) => `M ${-s} ${s * 0.5} L ${-s} ${-s * 0.3} L ${-s * 0.5} ${s * 0.1} L 0 ${-s * 0.6} L ${s * 0.5} ${s * 0.1} L ${s} ${-s * 0.3} L ${s} ${s * 0.5} Z`,
  (s) => `M ${s * 0.2} ${-s} A ${s} ${s} 0 1 0 ${s * 0.2} ${s} A ${s * 0.75} ${s * 0.75} 0 1 1 ${s * 0.2} ${-s} Z`,
  (s) => `M 0 ${-s * 0.2} C ${s} ${-s * 1.2} ${s * 1.1} ${s * 0.2} 0 ${s * 0.4} C ${-s * 1.1} ${s * 0.2} ${-s} ${-s * 1.2} 0 ${-s * 0.2} Z M 0 ${s * 0.4} L 0 ${s * 1.2}`,
  (s) => `M 0 ${-s * 1.2} L ${s * 0.18} ${s * 0.4} L ${-s * 0.18} ${s * 0.4} Z M ${-s * 0.6} ${s * 0.4} L ${s * 0.6} ${s * 0.4} M 0 ${s * 0.4} L 0 ${s * 1.1}`,
  (s) => `M ${-s * 0.7} ${s} C ${-s * 0.4} ${0} ${s * 0.2} ${-s * 0.8} ${s * 0.8} ${-s * 1.1} C ${s * 0.6} ${-s * 0.2} ${s * 0.1} ${s * 0.4} ${-s * 0.7} ${s} Z`,
  (s) => `M 0 ${-s} L ${s * 0.25} ${-s * 0.25} L ${s} 0 L ${s * 0.25} ${s * 0.25} L 0 ${s} L ${-s * 0.25} ${s * 0.25} L ${-s} 0 L ${-s * 0.25} ${-s * 0.25} Z`,
  (s) => `M ${-s * 0.5} ${s} L ${-s * 0.5} ${-s * 0.4} L ${-s * 0.7} ${-s * 0.4} L 0 ${-s * 1.2} L ${s * 0.7} ${-s * 0.4} L ${s * 0.5} ${-s * 0.4} L ${s * 0.5} ${s} Z`,
  (s) => `M ${-s} ${s * 0.2} C ${-s * 0.4} ${-s * 0.6} ${s * 0.3} ${-s * 0.7} ${s * 0.7} ${-s * 0.3} L ${s * 1.1} ${-s * 0.4} L ${s * 0.8} ${-s * 0.05} C ${s * 0.5} ${s * 0.5} ${-s * 0.2} ${s * 0.6} ${-s} ${s * 0.2} Z`,
];

/** Break a title into at most three short lines for a wedge. */
function lines(title: string, max: number) {
  const words = spineTitle(title).split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > 3) return [...out.slice(0, 2), `${out[2]}…`];
  return out;
}

export type WheelHandle = { spinTo: (index: number, onDone: () => void) => void };
export type WheelSlot = { id: string; title: string; cover_url?: string | null };

/**
 * The reading wheel as an old artefact: dark wedges with the book's cover
 * (or a gilt emblem) worked into each, gold spokes, a double gilt rim bound
 * by an ivy branch, an open-book medallion and a faceted gem pointer.
 * `spinTo` turns it several times, eases out and stops with the chosen
 * wedge under the gem.
 */
export const BookWheel = forwardRef<WheelHandle, { slots: WheelSlot[]; size: number; reduceMotion?: boolean; highlight?: boolean }>(function BookWheel({ slots, size, reduceMotion, highlight }, ref) {
  const rot = useSharedValue(0);
  const glow = useSharedValue(0);
  // Where the wheel came to rest, so every title can be turned to read upright on screen.
  const [rest, setRest] = useState(0);
  const n = Math.max(slots.length, 1);
  const seg = 360 / n;

  useImperativeHandle(ref, () => ({
    spinTo: (index, onDone) => {
      // Centre of wedge `index` sits at (index + 0.5) * seg clockwise from the top; a little jitter keeps it from looking mechanical.
      const jitter = (Math.random() - 0.5) * seg * 0.5;
      const target = -(index + 0.5) * seg + jitter;
      const current = rot.value % 360;
      let delta = target - current;
      while (delta > 0) delta -= 360;
      const turns = reduceMotion ? 0 : 6;
      glow.value = 0;
      const end = rot.value + delta - 360 * turns;
      const settle = () => {
        setRest(end);
        onDone();
      };
      rot.value = withTiming(end, { duration: reduceMotion ? 300 : 5200, easing: Easing.bezier(0.12, 0.65, 0.12, 1) }, (fin) => {
        if (fin) {
          glow.value = withSequence(withTiming(1, { duration: 260 }), withTiming(0.75, { duration: 500 }));
          runOnJS(settle)();
        }
      });
    },
  }));

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const c = size / 2;
  const R = c - 30;
  const hub = R * 0.2;
  const pt = (deg: number, r: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [c + r * Math.sin(a), c - r * Math.cos(a)];
  };
  const wedge = (a0: number, a1: number, r = R) => {
    if (n === 1) return `M ${c - r},${c} a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 ${-2 * r},0`;
    const [x0, y0] = pt(a0, r);
    const [x1, y1] = pt(a1, r);
    return `M ${c},${c} L ${x0},${y0} A ${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0},1 ${x1},${y1} Z`;
  };
  const arc = (2 * Math.PI * R * 0.66) / n;
  const fontSize = Math.max(10, Math.min(17, arc / 5.2));
  const maxChars = Math.max(7, Math.floor(arc / (fontSize * 0.48)));

  // The ivy: a twisted branch around the rim, and leaves along it.
  const vine = useMemo(() => {
    const twist = (phase: number, amp: number) => {
      let d = '';
      for (let k = 0; k <= 180; k++) {
        const deg = k * 2;
        const r = R + 15 + Math.sin((deg / 360) * Math.PI * 2 * 7 + phase) * amp;
        const [x, y] = pt(deg, r);
        d += `${k ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      return d;
    };
    const leaves = Array.from({ length: 26 }, (_, k) => {
      const deg = k * (360 / 26) + (hash(`leaf${k}`) % 9) - 4;
      const out = k % 2 ? 9 : -2;
      const [x, y] = pt(deg, R + 15 + out);
      return { x, y, rot: deg + (k % 2 ? 60 : -120) + (hash(`r${k}`) % 30), s: 0.8 + (hash(`s${k}`) % 5) / 10, light: k % 3 === 0 };
    });
    return { a: twist(0, 3.2), b: twist(Math.PI, 3.2), leaves };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [R, c]);

  const leaf = 'M 0 0 C 3 -5 9 -6 12 0 C 9 6 3 5 0 0 Z';

  return (
    <View style={{ width: size, height: size }}>
      {/* Soft lamplight behind the artefact. */}
      <Svg width={size} height={size} style={{ position: 'absolute' }} pointerEvents="none">
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0.6" stopColor={GILT.gold} stopOpacity="0.16" />
            <Stop offset="1" stopColor={GILT.gold} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill="url(#halo)" />
      </Svg>

      <Animated.View style={[{ position: 'absolute', inset: 0 }, spin]}>
        <Svg width={size} height={size}>
          <Defs>
            {GROUNDS.map(([a, b], i) => (
              <RadialGradient key={i} id={`g${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0.25" stopColor={b} />
                <Stop offset="1" stopColor={a} />
              </RadialGradient>
            ))}
            <RadialGradient id="vignette" cx="50%" cy="50%" r="50%">
              <Stop offset="0.55" stopColor="#000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000" stopOpacity="0.5" />
            </RadialGradient>
            {slots.map((_, i) => (
              <ClipPath key={i} id={`w${i}`}>
                <Path d={wedge(i * seg, (i + 1) * seg)} />
              </ClipPath>
            ))}
          </Defs>

          {slots.map((s, i) => {
            const a0 = i * seg;
            const mid = a0 + seg / 2;
            const onScreen = (((mid + rest) % 360) + 360) % 360;
            const flip = onScreen > 90 && onScreen < 270;
            const ls = lines(s.title, maxChars);
            const [mx, my] = pt(mid, R * 0.4);
            const art = R * 0.95;
            const [ax, ay] = pt(mid, R * 0.55);
            const motif = MOTIFS[hash(s.id) % MOTIFS.length](Math.min(11, arc / 7));
            return (
              <G key={`${s.id}-${i}`}>
                <Path d={wedge(a0, a0 + seg)} fill={`url(#g${hash(s.id + i) % GROUNDS.length})`} />
                {s.cover_url ? (
                  <G clipPath={`url(#w${i})`}>
                    <SvgImage href={{ uri: s.cover_url }} x={ax - art / 2} y={ay - art / 2} width={art} height={art} preserveAspectRatio="xMidYMid slice" opacity={0.42} />
                    {/* Tint the cover with the wedge's own ground so pale covers stay dark and titles stay readable. */}
                    <Path d={wedge(a0, a0 + seg)} fill={GROUNDS[hash(s.id + i) % GROUNDS.length][1]} fillOpacity={0.55} />
                  </G>
                ) : (
                  <G transform={`translate(${mx}, ${my}) rotate(${mid})`}>
                    <Path d={motif} fill={GILT.champagne} fillOpacity={0.22} stroke={GILT.gold} strokeWidth={1} strokeOpacity={0.75} />
                  </G>
                )}
                <G transform={`rotate(${flip ? mid + 180 : mid}, ${c}, ${c})`}>
                  {ls.map((line, j) => (
                    <SvgText
                      key={j}
                      x={c}
                      y={c + (flip ? 1 : -1) * R * 0.7 + (j - (ls.length - 1) / 2) * fontSize * 1.08 + fontSize * 0.35}
                      fill={GILT.ivory}
                      stroke="#000"
                      strokeWidth={0.4}
                      strokeOpacity={0.6}
                      fontSize={fontSize}
                      fontFamily={fonts.serifBold}
                      textAnchor="middle"
                    >
                      {line}
                    </SvgText>
                  ))}
                </G>
              </G>
            );
          })}
          <Circle cx={c} cy={c} r={R} fill="url(#vignette)" />

          {/* Gold spokes. */}
          {n > 1
            ? slots.map((_, i) => {
                const [x0, y0] = pt(i * seg, hub);
                const [x1, y1] = pt(i * seg, R);
                return (
                  <G key={`spoke${i}`}>
                    <Line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#5a4119" strokeWidth={3.4} />
                    <Line x1={x0} y1={y0} x2={x1} y2={y1} stroke={GILT.gold} strokeWidth={1.6} />
                  </G>
                );
              })
            : null}

          {/* Double gilt rim. */}
          <Circle cx={c} cy={c} r={R + 2} fill="none" stroke="#4a3412" strokeWidth={5} />
          <Circle cx={c} cy={c} r={R + 2} fill="none" stroke={GILT.gold} strokeWidth={2.4} />
          <Circle cx={c} cy={c} r={R + 7} fill="none" stroke={GILT.champagne} strokeWidth={0.8} strokeOpacity={0.6} />
          {Array.from({ length: n }, (_, i) => {
            const [x, y] = pt(i * seg, R + 2);
            return <Circle key={`stud${i}`} cx={x} cy={y} r={2.6} fill={GILT.champagne} stroke="#5a4119" strokeWidth={0.8} />;
          })}

          {/* The ivy branch. */}
          <Path d={vine.a} fill="none" stroke="#3b2714" strokeWidth={3.6} strokeLinecap="round" />
          <Path d={vine.b} fill="none" stroke="#5c3e22" strokeWidth={2.6} strokeLinecap="round" />
          <Path d={vine.a} fill="none" stroke="#8a6238" strokeWidth={0.9} strokeOpacity={0.7} />
          {vine.leaves.map((l, k) => (
            <G key={`leaf${k}`} transform={`translate(${l.x}, ${l.y}) rotate(${l.rot}) scale(${l.s})`}>
              <Path d={leaf} fill={l.light ? '#7f9a52' : '#4f6b35'} stroke="#2e4120" strokeWidth={0.6} />
              <Path d="M 0 0 L 11 0" stroke="#2e4120" strokeWidth={0.5} />
            </G>
          ))}
        </Svg>
      </Animated.View>

      {/* The medallion stays still: an open book under a small star, with its own little pointer. */}
      <Svg width={size} height={size} style={{ position: 'absolute' }} pointerEvents="none">
        <Defs>
          <RadialGradient id="hub" cx="50%" cy="45%" r="60%">
            <Stop offset="0" stopColor="#3b2615" />
            <Stop offset="1" stopColor="#140c07" />
          </RadialGradient>
          <LinearGradient id="gem" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#fff1c4" />
            <Stop offset="0.45" stopColor={GILT.champagne} />
            <Stop offset="1" stopColor="#9b7124" />
          </LinearGradient>
        </Defs>
        <Polygon points={`${c},${c - hub - 22} ${c + 6},${c - hub - 6} ${c},${c - hub + 2} ${c - 6},${c - hub - 6}`} fill="url(#gem)" stroke="#6e5019" strokeWidth={1} />
        <Circle cx={c} cy={c} r={hub} fill="url(#hub)" stroke={GILT.gold} strokeWidth={3} />
        <Circle cx={c} cy={c} r={hub - 6} fill="none" stroke={GILT.champagne} strokeWidth={0.8} strokeOpacity={0.6} />
        <G transform={`translate(${c}, ${c + hub * 0.12}) scale(${hub / 34})`}>
          <Path d="M 0 -6 C -6 -11 -15 -11 -20 -8 L -20 10 C -15 7 -6 7 0 12 C 6 7 15 7 20 10 L 20 -8 C 15 -11 6 -11 0 -6 Z" fill="none" stroke={GILT.champagne} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M 0 -6 L 0 12" stroke={GILT.champagne} strokeWidth={1.4} />
          <Path d="M -15 -4 C -10 -6 -6 -5 -3 -3 M -15 1 C -10 -1 -6 0 -3 2 M 15 -4 C 10 -6 6 -5 3 -3 M 15 1 C 10 -1 6 0 3 2" stroke={GILT.gold} strokeWidth={0.9} fill="none" />
          <Path d="M 0 -24 L 2 -18 L 8 -16 L 2 -14 L 0 -8 L -2 -14 L -8 -16 L -2 -18 Z" fill="#fff1c4" />
        </G>
      </Svg>

      {/* The chosen wedge glows once the wheel stops under the gem. */}
      {highlight && n > 1 ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, glowStyle]}>
          <Svg width={size} height={size}>
            <Path d={wedge(-seg / 2, seg / 2)} fill={GILT.champagne} fillOpacity={0.12} stroke={GILT.champagne} strokeWidth={6} strokeOpacity={0.35} />
            <Path d={wedge(-seg / 2, seg / 2)} fill="none" stroke="#fff1c4" strokeWidth={2} />
          </Svg>
        </Animated.View>
      ) : null}

      {/* The gem pointer stays still at the top. */}
      <Svg width={size} height={56} style={{ position: 'absolute', top: -14, left: 0 }} pointerEvents="none">
        <Defs>
          <LinearGradient id="gemTop" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#fff4d0" />
            <Stop offset="0.5" stopColor={GILT.champagne} />
            <Stop offset="1" stopColor="#8f6620" />
          </LinearGradient>
        </Defs>
        <Polygon points={`${c},2 ${c + 13},20 ${c},54 ${c - 13},20`} fill="url(#gemTop)" stroke="#5f4414" strokeWidth={1.5} />
        <Polygon points={`${c},2 ${c + 13},20 ${c},20`} fill="#fffbe9" opacity={0.6} />
        <Polygon points={`${c - 13},20 ${c},20 ${c},54`} fill="#000" opacity={0.18} />
        <Path d={`M ${c - 13} 20 L ${c + 13} 20`} stroke="#5f4414" strokeWidth={0.8} />
      </Svg>
    </View>
  );
});
