import { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

import { BookOpenIcon } from '@/components/icons';
import { fonts } from '@/theme';
import { hash, spineTitle } from '@/utils/sagas';

const SEGMENTS = ['#1d1813', '#231a14', '#181a1f', '#21161a', '#1a1d17', '#1f1914'];
const GOLD = '#C9A45C';
const flip = (deg: number) => deg > 90 && deg < 270;

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

/**
 * A dark wheel ringed by a vine, a gem pointer at the top and a book
 * medallion in the middle. `spinTo` turns it a few times and lands the
 * chosen wedge under the pointer.
 */
export const BookWheel = forwardRef<WheelHandle, { titles: string[]; size: number; reduceMotion?: boolean }>(function BookWheel({ titles, size, reduceMotion }, ref) {
  const rot = useSharedValue(0);
  const n = Math.max(titles.length, 1);
  const seg = 360 / n;

  useImperativeHandle(ref, () => ({
    spinTo: (index, onDone) => {
      // Centre of wedge `index` sits at (index + 0.5) * seg clockwise from the top.
      const target = -(index + 0.5) * seg;
      const current = rot.value % 360;
      let delta = target - current;
      while (delta > 0) delta -= 360;
      const turns = reduceMotion ? 0 : 5;
      rot.value = withTiming(rot.value + delta - 360 * turns, { duration: reduceMotion ? 300 : 4200, easing: Easing.out(Easing.cubic) }, (fin) => {
        if (fin) runOnJS(onDone)();
      });
    },
  }));

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const c = size / 2;
  const R = c - 20;
  const p = (deg: number, r = R) => {
    const a = (deg * Math.PI) / 180;
    return `${c + r * Math.sin(a)},${c - r * Math.cos(a)}`;
  };
  const fontSize = Math.max(10, Math.min(16, (R * 0.9) / Math.max(6, n * 0.9)));
  const leaves = Array.from({ length: 30 }, (_, k) => k * 12 + (hash(`leaf${k}`) % 7));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ position: 'absolute', inset: 0 }, spin]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="shade" cx="50%" cy="50%" r="50%">
              <Stop offset="0.55" stopColor="#000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000" stopOpacity="0.45" />
            </RadialGradient>
          </Defs>
          {titles.map((t, i) => {
            const a0 = i * seg;
            const a1 = (i + 1) * seg;
            const mid = a0 + seg / 2;
            const ls = lines(t, n > 8 ? 11 : 14);
            return (
              <G key={`${t}-${i}`}>
                <Path d={n === 1 ? `M ${c - R},${c} a ${R},${R} 0 1,0 ${2 * R},0 a ${R},${R} 0 1,0 ${-2 * R},0` : `M ${c},${c} L ${p(a0)} A ${R},${R} 0 ${seg > 180 ? 1 : 0},1 ${p(a1)} Z`} fill={SEGMENTS[i % SEGMENTS.length]} stroke="#6d4f2c" strokeWidth={1.5} />
                {/* Lower-half labels are turned round so they never read upside down. */}
                <G transform={`rotate(${flip(mid) ? mid + 180 : mid}, ${c}, ${c})`}>
                  {ls.map((line, j) => (
                    <SvgText key={j} x={c} y={c + (flip(mid) ? 1 : -1) * R * 0.64 + (j - (ls.length - 1) / 2) * fontSize * 1.1} fill="#EBD9B4" fontSize={fontSize} fontFamily={fonts.display} textAnchor="middle">
                      {line}
                    </SvgText>
                  ))}
                </G>
              </G>
            );
          })}
          <Circle cx={c} cy={c} r={R} fill="url(#shade)" />
          {/* The vine: a twisted branch with leaves. */}
          <Circle cx={c} cy={c} r={R + 5} fill="none" stroke="#4a3018" strokeWidth={9} />
          <Circle cx={c} cy={c} r={R + 5} fill="none" stroke="#7a5430" strokeWidth={2.5} strokeDasharray="14 9" />
          <Circle cx={c} cy={c} r={R + 1} fill="none" stroke="#2b1b0e" strokeWidth={1.5} />
          {leaves.map((deg, k) => {
            const [x, y] = p(deg, R + (k % 2 ? 11 : 4)).split(',').map(Number);
            return <Ellipse key={k} cx={x} cy={y} rx={7} ry={3.6} fill={k % 3 ? '#5f7a3b' : '#7d9a4c'} opacity={0.95} transform={`rotate(${deg + (k % 2 ? 40 : -35)}, ${x}, ${y})`} />;
          })}
          <Circle cx={c} cy={c} r={R * 0.19} fill="#24190f" stroke={GOLD} strokeWidth={3} />
          <Circle cx={c} cy={c} r={R * 0.19 - 6} fill="none" stroke="#6d4f2c" strokeWidth={1} />
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={{ position: 'absolute', left: c - R * 0.1, top: c - R * 0.1, width: R * 0.2, height: R * 0.2, alignItems: 'center', justifyContent: 'center' }}>
        <BookOpenIcon size={R * 0.15} color="#E8C26A" weight="duotone" />
      </View>
      {/* The gem pointer stays still at the top. */}
      <Svg width={size} height={40} style={{ position: 'absolute', top: -6, left: 0 }} pointerEvents="none">
        <Polygon points={`${c},2 ${c + 11},16 ${c},38 ${c - 11},16`} fill="#E8C26A" stroke="#7a5a25" strokeWidth={1.5} />
        <Polygon points={`${c},2 ${c + 11},16 ${c},16`} fill="#fff3cf" opacity={0.55} />
      </Svg>
    </View>
  );
});
