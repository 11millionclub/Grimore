import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { BookWheel, type WheelHandle, type WheelSlot } from '@/components/book-wheel';
import { FunnelIcon, PepperIcon, StarIcon } from '@/components/icons';
import { GiltDivider } from '@/components/ornament';
import { Btn, Chip, Cover, EmptyState, Press, Screen, Segmented, Skeleton, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { refreshLibrary } from '@/lib/query-client';
import { getGenres } from '@/services/catalogue';
import { getEntry, saveEntry, statusPatch } from '@/services/library';
import { spinsLeft, takeSpin, wheelPool, type WheelBook, type WheelSource } from '@/services/wheel';
import { DarkTheme, fonts, GILT, radius, spacing, useTheme } from '@/theme';
import { TROPES } from '@/utils/review-tags';
import { hash } from '@/utils/sagas';

const MAX_WEDGES = 12;
const MIN_WEDGES = 10;
type Length = 'any' | 'short' | 'long';

/** The wheel of what to read next, as a magical artefact on a dark table. */
export default function WheelScreen() {
  return (
    <DarkTheme>
      <Wheel />
    </DarkTheme>
  );
}

/**
 * One spin and two rerolls a day, fed by your to-be-read list, the books you
 * own, or recommendations from your reader profile. Spice, length and trope
 * are always on show; genre and priority sit under "More filters".
 */
function Wheel() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const wheel = useRef<WheelHandle>(null);
  const [source, setSource] = useState<WheelSource>('tbr');
  const [genre, setGenre] = useState<number | null>(null);
  const [trope, setTrope] = useState<string | null>(null);
  const [priority, setPriority] = useState(false);
  const [spice, setSpice] = useState<number | null>(null);
  const [length, setLength] = useState<Length>('any');
  const [more, setMore] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelBook | null>(null);
  const [seed, setSeed] = useState(0);

  const pool = useQuery({ queryKey: ['wheelPool', me, source], queryFn: () => wheelPool(me, source) });
  const left = useQuery({ queryKey: ['wheelSpins', me], queryFn: spinsLeft });
  const genres = useQuery({ queryKey: ['genres'], queryFn: getGenres, staleTime: 3_600_000 });

  const matches = useMemo(
    () =>
      (pool.data ?? []).filter(
        (b) =>
          (genre == null || b.genreIds.includes(genre)) &&
          (!trope || b.tropes.includes(trope)) &&
          (!priority || b.priority) &&
          (spice == null || (spice === 0 ? !b.spice : (b.spice ?? 0) >= spice)) &&
          (length === 'any' || (b.pages != null && (length === 'short' ? b.pages < 320 : b.pages >= 450))),
      ),
    [pool.data, genre, trope, priority, spice, length],
  );
  // Up to 12 different books (priority books first). With fewer, books repeat so the wheel always has 10+ wedges.
  const books = useMemo(() => [...matches].sort((a, b) => Number(b.priority) - Number(a.priority) || (hash(a.id + seed) % 997) - (hash(b.id + seed) % 997)).slice(0, MAX_WEDGES), [matches, seed]);
  const slots: (WheelSlot & { book: WheelBook })[] = useMemo(() => {
    if (books.length < 2) return books.map((b) => ({ id: b.id, title: b.title, cover_url: b.cover_url, book: b }));
    const n = Math.max(books.length, MIN_WEDGES);
    return Array.from({ length: n }, (_, i) => books[i % books.length]).map((b) => ({ id: b.id, title: b.title, cover_url: b.cover_url, book: b }));
  }, [books]);
  const presentGenres = useMemo(() => {
    const ids = new Set((pool.data ?? []).flatMap((b) => b.genreIds));
    return (genres.data ?? []).filter((g) => ids.has(g.id));
  }, [pool.data, genres.data]);

  const start = useMutation({
    mutationFn: async (b: WheelBook) => {
      const e = await getEntry(me, b.id);
      await saveEntry(me, b.id, statusPatch('reading', e));
    },
    onSuccess: (_d, b) => {
      void refreshLibrary(qc);
      toast(`Enjoy ${b.title}`);
      router.push({ pathname: '/book/[id]', params: { id: b.id } });
    },
    onError: (e) => toast(toAppError(e).message),
  });

  const spin = async () => {
    if (spinning || slots.length === 0) return;
    const index = Math.floor(Math.random() * slots.length);
    const pick = slots[index].book;
    setSpinning(true);
    setResult(null);
    try {
      const remaining = await takeSpin(pick.id);
      qc.setQueryData(['wheelSpins', me], remaining);
    } catch (e) {
      setSpinning(false);
      void left.refetch();
      return toast(toAppError(e).message);
    }
    wheel.current?.spinTo(index, () => {
      setSpinning(false);
      setResult(pick);
    });
  };

  const spins = left.data ?? 0;
  const used = 3 - spins;
  const rerolls = Math.min(2, spins);
  const size = Math.min(width - spacing.md * 2, 440);
  const label = spinning ? 'SPINNING' : spins <= 0 ? 'TOMORROW' : used === 0 ? 'SPIN' : 'REROLL';
  const extra = [genre != null, priority].filter(Boolean).length;

  return (
    <Screen title="What to read next" back refreshing={pool.isRefetching} onRefresh={() => Promise.all([pool.refetch(), left.refetch()])}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <Segmented
          value={source}
          onChange={(v) => {
            setSource(v);
            setResult(null);
            setGenre(null);
          }}
          options={[
            { value: 'tbr', label: 'To be read' },
            { value: 'owned', label: 'Owned' },
            { value: 'rec', label: 'For you' },
          ]}
        />
      </View>

      {/* Quick filters: spice, length and trope are always one tap away. */}
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <Chip active={spice == null} onPress={() => setSpice(null)} icon={<PepperIcon size={14} weight="fill" color={spice == null ? colors.onAccent : colors.danger} />}>
            Any spice
          </Chip>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <Chip key={n} active={spice === n} onPress={() => setSpice(spice === n ? null : n)}>
              {n === 0 ? 'No spice' : `${n}+`}
            </Chip>
          ))}
          <View style={{ width: 1, backgroundColor: colors.line, marginHorizontal: 2 }} />
          {(['any', 'short', 'long'] as const).map((l) => (
            <Chip key={l} active={length === l} onPress={() => setLength(l)}>
              {l === 'any' ? 'Any length' : l === 'short' ? 'Short (<320 p.)' : 'Long (450+ p.)'}
            </Chip>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <Chip active={!trope} onPress={() => setTrope(null)}>
            Any trope
          </Chip>
          {TROPES.map((t) => (
            <Chip key={t.key} active={trope === t.key} onPress={() => setTrope(trope === t.key ? null : t.key)}>
              {t.label}
            </Chip>
          ))}
        </ScrollView>
        <Press onPress={() => setMore(!more)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: spacing.lg }}>
          <FunnelIcon size={16} color={colors.accent} />
          <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
            {more ? 'Fewer filters' : `More filters${extra ? ` · ${extra}` : ''}`}
          </Text>
        </Press>
        {more ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            {source !== 'rec' ? (
              <Chip active={priority} onPress={() => setPriority(!priority)} icon={<StarIcon size={14} weight="fill" color={colors.gold} />}>
                Priority only
              </Chip>
            ) : null}
            <Chip active={genre == null} onPress={() => setGenre(null)}>
              Any genre
            </Chip>
            {presentGenres.map((g) => (
              <Chip key={g.id} active={genre === g.id} onPress={() => setGenre(genre === g.id ? null : g.id)}>
                {g.name}
              </Chip>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.sm, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(198,154,67,0.35)' }}>
        <LinearGradient colors={['#18120d', GILT.black, '#0a0806']} style={{ position: 'absolute', inset: 0 }} />
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.lg }}>
          {pool.isLoading ? (
            <Skeleton width={size * 0.85} height={size * 0.85} rounded={size} />
          ) : slots.length === 0 ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <EmptyState
                title={(pool.data ?? []).length ? 'Nothing matches these filters' : source === 'tbr' ? 'Your wishlist is empty' : source === 'owned' ? 'No unread books you own' : 'No recommendations yet'}
                body={(pool.data ?? []).length ? 'Loosen a filter to fill the wheel.' : 'Add books to your library and the wheel fills up.'}
              />
            </View>
          ) : (
            <>
              <BookWheel ref={wheel} slots={slots} size={size} reduceMotion={!!reduce} highlight={!!result} />
              <SpinButton label={label} disabled={spinning || spins <= 0} onPress={() => void spin()} a11y={spins <= 0 ? 'No spins left today' : used === 0 ? 'Spin the wheel' : `Reroll, ${spins} left today`} />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }} accessibilityLabel={`${used === 0 ? 'Daily spin available' : 'Daily spin used'}, ${rerolls} of 2 rerolls left`}>
                  <Pip on={used === 0} label="Spin" />
                  <Pip on={rerolls >= 2} label="Reroll" />
                  <Pip on={rerolls >= 1} label="Reroll" />
                </View>
                <Text variant="caption" color="rgba(242,233,216,0.7)">
                  {spins <= 0 ? 'The wheel rests until tomorrow' : used === 0 ? 'One spin and two rerolls a day' : `${rerolls} ${rerolls === 1 ? 'reroll' : 'rerolls'} left today`} · {matches.length} {matches.length === 1 ? 'book' : 'books'} eligible
                </Text>
                {matches.length > MAX_WEDGES && !spinning ? (
                  <Press onPress={() => setSeed(seed + 1)} style={{ paddingVertical: 4 }}>
                    <Text variant="caption" color={GILT.champagne} style={{ fontFamily: fonts.semibold }}>
                      Shuffle the books on the wheel
                    </Text>
                  </Press>
                ) : null}
              </View>
            </>
          )}
        </View>
      </View>

      {result ? (
        <View style={{ margin: spacing.lg, gap: spacing.md, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1.5, borderColor: GILT.gold, padding: spacing.lg }}>
          <Text variant="micro" color={GILT.champagne} style={{ letterSpacing: 2 }}>
            THE WHEEL HAS CHOSEN
          </Text>
          <GiltDivider width={180} />
          <View style={{ flexDirection: 'row', gap: spacing.base, alignSelf: 'stretch' }}>
            <Cover uri={result.cover_url} title={result.title} width={84} />
            <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.serifBold, fontSize: 24, lineHeight: 28 }} numberOfLines={3}>
                {result.title}
              </Text>
              <Text variant="small" tone="muted" numberOfLines={1}>
                {result.authors}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' }}>
            <Btn style={{ flex: 1 }} loading={start.isPending} onPress={() => start.mutate(result)}>
              Start reading
            </Btn>
            <Btn style={{ flex: 1 }} variant="secondary" onPress={() => router.push({ pathname: '/book/[id]', params: { id: result.id } })}>
              Open book
            </Btn>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

/** The SPIN plate: a walnut cartouche with a double gilt border and lozenges at either end. */
function SpinButton({ label, disabled, onPress, a11y }: { label: string; disabled: boolean; onPress: () => void; a11y: string }) {
  return (
    <Press accessibilityLabel={a11y} disabled={disabled} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 12, height: 12, transform: [{ rotate: '45deg' }], backgroundColor: GILT.gold, borderWidth: 1, borderColor: GILT.champagne, zIndex: 1, marginRight: -5 }} />
      <View style={{ minWidth: 220, height: 64, borderRadius: 14, borderWidth: 2, borderColor: GILT.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
        <LinearGradient colors={['#3a2717', '#1e140c']} style={{ position: 'absolute', inset: 0 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: 10, borderWidth: 1, borderColor: GILT.champagne, opacity: 0.5 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: GILT.gold, fontSize: 12 }}>✦</Text>
          <Text style={{ fontFamily: fonts.serifBold, fontSize: label.length > 5 ? 22 : 30, letterSpacing: 5, color: GILT.champagne }}>{label}</Text>
          <Text style={{ color: GILT.gold, fontSize: 12 }}>✦</Text>
        </View>
      </View>
      <View style={{ width: 12, height: 12, transform: [{ rotate: '45deg' }], backgroundColor: GILT.gold, borderWidth: 1, borderColor: GILT.champagne, zIndex: 1, marginLeft: -5 }} />
    </Press>
  );
}

function Pip({ on, label }: { on: boolean; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={{ width: 12, height: 12, transform: [{ rotate: '45deg' }], borderWidth: 1.2, borderColor: GILT.gold, backgroundColor: on ? GILT.gold : 'transparent' }} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 9.5, color: 'rgba(242,233,216,0.6)' }}>{label}</Text>
    </View>
  );
}
