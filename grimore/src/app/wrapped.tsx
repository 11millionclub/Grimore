import { useQuery } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { DownloadSimpleIcon, MoonStarsIcon, ShareFatIcon, XIcon } from '@/components/icons';
import { Avatar, Cover, Press, Text } from '@/components/ui';
import { useMyId, useMyProfile } from '@/hooks/queries';
import { getWrapped, type WrappedData } from '@/services/stats';
import { fonts, radius, spacing } from '@/theme';
import { ARCHETYPES, type Arch } from '@/utils/archetypes';
import { fmt } from '@/utils/dates';

const DURATION = 5200;
type Slide = { bg: string; fg: string; body: ReactNode };

function R({ children, i = 0 }: { children: ReactNode; i?: number }) {
  return <Animated.View entering={FadeInDown.duration(600).delay(150 + i * 220).reduceMotion(ReduceMotion.System)}>{children}</Animated.View>;
}

function Count({ to, color, size }: { to: number; color: string; size: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 1400);
      setV(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p >= 1) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [to]);
  return <Text style={{ fontFamily: fonts.bold, fontSize: size, lineHeight: size * 1.02, letterSpacing: -size * 0.035, fontVariant: ['tabular-nums'] }} color={color}>{fmt(v)}</Text>;
}

const big = (size: number, color: string) => ({ fontFamily: fonts.bold, fontSize: size, lineHeight: size * 1.02, letterSpacing: -size * 0.035, color });

function slides(d: WrappedData, archetype: Arch | null, summary: ReactNode): Slide[] {
  const s: Slide[] = [];
  const month = d.period === 'month';
  s.push({
    bg: month ? '#ff6a3d' : '#0c0d0f',
    fg: month ? '#160803' : '#f2f2f0',
    body: (
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.xxl }}>
        <R>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 17, opacity: 0.7 }} color={month ? '#160803' : '#f2f2f0'}>
            {month ? 'Your Wrapped for' : 'Grimore Wrapped'}
          </Text>
        </R>
        <R i={1}>
          <Text style={big(month ? 84 : 120, month ? '#160803' : '#ff6a3d')}>{d.label}</Text>
        </R>
        <R i={2}>
          <Text style={{ fontSize: 17, lineHeight: 23, marginTop: spacing.lg, opacity: 0.8, maxWidth: 300 }} color={month ? '#160803' : '#f2f2f0'}>
            {d.pages || d.books.length ? (month ? 'Let’s see what you read, when, and how it went.' : 'A whole year of pages. Ready?') : 'A quiet one so far. Log a few pages and come back.'}
          </Text>
        </R>
      </View>
    ),
  });
  if (d.pages)
    s.push({
      bg: '#10261b',
      fg: '#e9f5ee',
      body: (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <R>
            <Text style={{ fontSize: 19, opacity: 0.7 }} color="#e9f5ee">
              You read
            </Text>
          </R>
          <R i={1}>
            <Count to={d.pages} size={96} color="#7ee2a8" />
          </R>
          <R i={2}>
            <Text style={big(34, '#e9f5ee')}>pages.</Text>
          </R>
          {d.previousPages ? (
            <R i={3}>
              <Text style={{ fontSize: 17, lineHeight: 23, marginTop: spacing.xl, opacity: 0.8 }} color="#e9f5ee">
                {d.pages >= d.previousPages ? `${fmt(d.pages - d.previousPages)} more than the ${month ? 'month' : 'year'} before.` : `${fmt(d.previousPages - d.pages)} fewer than the ${month ? 'month' : 'year'} before. Quality over quantity.`}
              </Text>
            </R>
          ) : null}
        </View>
      ),
    });
  if (!month && d.books.length)
    s.push({
      bg: '#ff6a3d',
      fg: '#160803',
      body: (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <R>
            <Text style={{ fontSize: 19, opacity: 0.7 }} color="#160803">
              You finished
            </Text>
          </R>
          <R i={1}>
            <Count to={d.books.length} size={150} color="#160803" />
          </R>
          <R i={2}>
            <Text style={big(34, '#160803')}>{d.books.length === 1 ? 'book.' : 'books.'}</Text>
          </R>
        </View>
      ),
    });
  if (d.topBook)
    s.push({
      bg: '#1b2f8f',
      fg: '#eef1ff',
      body: (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <R>
            <Text style={{ fontSize: 19, opacity: 0.7 }} color="#eef1ff">
              {month ? 'Book of the month' : 'Book of the year'}
            </Text>
          </R>
          <R i={1}>
            <View style={{ alignItems: 'center', marginVertical: spacing.xxl, transform: [{ rotate: '-3deg' }] }}>
              <Cover uri={d.topBook.cover_url} title={d.topBook.title} author={d.topBook.authors} width={170} />
            </View>
          </R>
          <R i={2}>
            <Text style={big(38, '#eef1ff')}>{d.topBook.title}</Text>
          </R>
          <R i={3}>
            <Text style={{ fontSize: 17, marginTop: spacing.sm, opacity: 0.8 }} color="#eef1ff">
              {d.topBook.authors}
              {d.topBook.rating ? ` · ${d.topBook.rating} stars` : ''}
            </Text>
          </R>
        </View>
      ),
    });
  if (!month && d.topAuthor && d.topAuthor.books.length > 1)
    s.push({
      bg: '#10261b',
      fg: '#e9f5ee',
      body: (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <R>
            <Text style={{ fontSize: 19, opacity: 0.7 }} color="#e9f5ee">
              Author of your year
            </Text>
          </R>
          <R i={1}>
            <Text style={big(52, '#e9f5ee')}>{d.topAuthor.name}</Text>
          </R>
          <R i={2}>
            <View style={{ flexDirection: 'row', gap: spacing.base, marginTop: spacing.xxl }}>
              {d.topAuthor.books.slice(0, 2).map((b, i) => (
                <View key={b.id} style={{ transform: [{ rotate: i ? '3deg' : '-3deg' }] }}>
                  <Cover uri={b.cover_url} title={b.title} width={130} />
                </View>
              ))}
            </View>
          </R>
        </View>
      ),
    });
  if (d.topGenre.length)
    s.push({
      bg: '#15171a',
      fg: '#f2f2f0',
      body: (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <R>
            <Text style={{ fontSize: 19, opacity: 0.7 }} color="#f2f2f0">
              Your genre
            </Text>
          </R>
          <R i={1}>
            <Text style={big(56, '#ff6a3d')}>{d.topGenre[0].name}</Text>
          </R>
          <R i={2}>
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              {d.topGenre.map((g, i) => (
                <View key={g.name}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 15 }} color="#f2f2f0">
                      {g.name}
                    </Text>
                    <Text style={{ fontSize: 15, opacity: 0.6 }} color="#f2f2f0">
                      {g.pct}%
                    </Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, width: `${(g.pct / d.topGenre[0].pct) * 100}%`, backgroundColor: '#ff6a3d', opacity: 1 - i * 0.3 }} />
                </View>
              ))}
            </View>
          </R>
        </View>
      ),
    });
  if (d.peakHour !== null)
    s.push({
      bg: '#0b0f1f',
      fg: '#e8ecff',
      body: (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <R>
            <MoonStarsIcon size={56} weight="fill" color="#ffd36a" />
          </R>
          <R i={1}>
            <Text style={[big(52, '#e8ecff'), { marginTop: spacing.xl }]}>{`The ${d.peakHour}:00 reader`}</Text>
          </R>
          <R i={2}>
            <Text style={{ fontSize: 17, lineHeight: 23, marginTop: spacing.base, opacity: 0.8 }} color="#e8ecff">
              {Math.round(d.lateShare * 100)}% of your pages were read after 10 pm.{d.streak > 1 ? ` Your longest streak: ${d.streak} days in a row.` : ''}
            </Text>
          </R>
        </View>
      ),
    });
  if (d.percentile !== null)
    s.push({
      bg: '#ece9ff',
      fg: '#17142e',
      body: (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <R>
            <Text style={{ fontSize: 19, opacity: 0.7 }} color="#17142e">
              Among the people you follow
            </Text>
          </R>
          <R i={1}>
            <Text style={big(52, '#17142e')}>{`You read more than ${d.percentile}%.`}</Text>
          </R>
        </View>
      ),
    });
  if (!month && archetype)
    s.push({
      bg: '#0b0f1f',
      fg: '#e8ecff',
      body: (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <R>
            <Text style={{ fontSize: 19, opacity: 0.7 }} color="#e8ecff">
              This year you were
            </Text>
          </R>
          <R i={1}>
            <Text style={big(52, '#e8ecff')}>{ARCHETYPES[archetype].name}</Text>
          </R>
          <R i={2}>
            <Text style={{ fontSize: 17, lineHeight: 23, marginTop: spacing.base, opacity: 0.8 }} color="#e8ecff">
              {ARCHETYPES[archetype].line}
            </Text>
          </R>
        </View>
      ),
    });
  s.push({ bg: '#0c0d0f', fg: '#f2f2f0', body: summary });
  return s;
}

export default function Wrapped() {
  const { period } = useLocalSearchParams<{ period?: 'month' | 'year' }>();
  const insets = useSafeAreaInsets();
  const me = useMyId()!;
  const profile = useMyProfile();
  const q = useQuery({ queryKey: ['wrapped', me, period], queryFn: () => getWrapped(me, period === 'year' ? 'year' : 'month') });
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const shot = useRef<ViewShotRef>(null);
  const d = q.data;
  const p = profile.data;

  const shareImage = async () => {
    try {
      const uri = await shot.current?.capture?.();
      if (uri && Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      else await Share.share({ message: `My Grimore Wrapped ${d?.label}: ${fmt(d?.pages ?? 0)} pages, ${d?.books.length ?? 0} books.` });
    } catch {
      /* cancelled */
    }
  };

  const summary = d ? (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <R>
        <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
          <View style={{ borderRadius: 24, backgroundColor: '#ff6a3d', padding: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar uri={p?.avatar_url} name={p?.display_name} size={30} />
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14 }} color="#160803">
                  @{p?.username}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, opacity: 0.7 }} color="#160803">
                {d.label}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
              {(d.books.length ? d.books : []).slice(0, 4).map((b) => (
                <View key={b.id} style={{ flex: 1 }}>
                  <Cover uri={b.cover_url} title={b.title} width={70} style={{ width: '100%', height: undefined, aspectRatio: 2 / 3 }} />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg, rowGap: spacing.base }}>
              {[
                [fmt(d.pages), 'pages'],
                [String(d.books.length), 'books'],
                [String(d.streak), 'day streak'],
                [d.topGenre[0]?.name ?? '—', 'genre'],
              ].map(([v, l]) => (
                <View key={l} style={{ width: '50%' }}>
                  <Text style={big(30, '#160803')} numberOfLines={1}>
                    {v}
                  </Text>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, opacity: 0.7 }} color="#160803">
                    {l}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, marginTop: spacing.lg }} color="#160803">
              grimore
            </Text>
          </View>
        </ViewShot>
      </R>
      <R i={1}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
          <Press onPress={shareImage} style={{ flex: 1, height: 48, borderRadius: radius.full, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
            <ShareFatIcon size={18} weight="fill" color="#000" />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15 }} color="#000">
              Share
            </Text>
          </Press>
          <Press onPress={shareImage} accessibilityLabel="Save image" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <DownloadSimpleIcon size={20} color="#fff" />
          </Press>
        </View>
      </R>
    </View>
  ) : null;

  const list = d ? slides(d, (p?.archetype ?? null) as Arch | null, summary) : [];
  const n = list.length;

  useEffect(() => {
    if (!n || paused) return;
    const started = Date.now() - progress * DURATION;
    const t = setInterval(() => {
      const pr = (Date.now() - started) / DURATION;
      if (pr >= 1) {
        clearInterval(t);
        if (i < n - 1) {
          setI(i + 1);
          setProgress(0);
        } else setProgress(1);
      } else setProgress(pr);
    }, 50);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, paused, n]);

  const s = list[Math.min(i, n - 1)];
  if (!s) return <View style={{ flex: 1, backgroundColor: '#0c0d0f' }} />;
  const go = (k: number) => {
    setI(Math.max(0, Math.min(n - 1, k)));
    setProgress(0);
  };
  return (
    <View style={{ flex: 1, backgroundColor: s.bg }}>
      <View style={{ position: 'absolute', top: insets.top + 6, left: 12, right: 12, flexDirection: 'row', gap: 4, zIndex: 5 }}>
        {list.map((_, k) => (
          <View key={k} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: s.fg + '40', overflow: 'hidden' }}>
            <View style={{ width: `${(k < i ? 1 : k === i ? progress : 0) * 100}%`, height: '100%', backgroundColor: s.fg }} />
          </View>
        ))}
      </View>
      <View style={{ position: 'absolute', top: insets.top + 18, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Avatar uri={p?.avatar_url} name={p?.display_name} size={28} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13 }} color={s.fg}>
            Wrapped
          </Text>
        </View>
        <Press onPress={() => router.back()} accessibilityLabel="Close" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <XIcon size={22} weight="bold" color={s.fg} />
        </Press>
      </View>
      <Pressable
        accessibilityLabel="Next"
        style={{ position: 'absolute', inset: 0 }}
        onPressIn={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        delayLongPress={250}
        onLongPress={() => undefined}
        onPress={(e) => (e.nativeEvent.locationX < 120 ? go(i - 1) : go(i + 1))}
      />
      <Animated.View key={i} entering={FadeIn.duration(350)} pointerEvents="box-none" style={{ flex: 1, paddingHorizontal: 28, paddingTop: insets.top + 70, paddingBottom: insets.bottom + 30 }}>
        {s.body}
      </Animated.View>
    </View>
  );
}
