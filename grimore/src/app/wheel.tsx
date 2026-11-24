import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { BookWheel, type WheelHandle } from '@/components/book-wheel';
import { FunnelIcon, PepperIcon, StarIcon } from '@/components/icons';
import { Btn, Chip, Cover, EmptyState, Press, Screen, Segmented, Skeleton, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { refreshLibrary } from '@/lib/query-client';
import { getGenres } from '@/services/catalogue';
import { getEntry, saveEntry, statusPatch } from '@/services/library';
import { spinsLeft, takeSpin, wheelPool, type WheelBook, type WheelSource } from '@/services/wheel';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { TROPES } from '@/utils/review-tags';
import { hash } from '@/utils/sagas';

const MAX_WEDGES = 12;

/**
 * The wheel of what to read next: one spin and two rerolls a day, fed by
 * your to-be-read list, the books you own, or recommendations from your
 * reader profile, filtered by genre, trope, priority and spice.
 */
export default function Wheel() {
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
  const [filters, setFilters] = useState(false);
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
          (spice == null || (spice === 0 ? !b.spice : (b.spice ?? 0) >= spice)),
      ),
    [pool.data, genre, trope, priority, spice],
  );
  // A changing sample of up to 12 wedges; priority books always make the cut.
  const wedges = useMemo(() => {
    const sorted = [...matches].sort((a, b) => Number(b.priority) - Number(a.priority) || (hash(a.id + seed) % 997) - (hash(b.id + seed) % 997));
    return sorted.slice(0, MAX_WEDGES);
  }, [matches, seed]);
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
    if (spinning || wedges.length === 0) return;
    const index = Math.floor(Math.random() * wedges.length);
    const pick = wedges[index];
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
  const size = Math.min(width - spacing.lg * 2, 380);
  const label = spins <= 0 ? 'Come back tomorrow' : used === 0 ? 'SPIN' : `REROLL · ${spins} left`;

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
        <Press onPress={() => setFilters(!filters)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', paddingVertical: 4 }}>
          <FunnelIcon size={16} color={colors.accent} />
          <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
            Filters{[genre != null, trope, priority, spice != null].filter(Boolean).length ? ` · ${[genre != null, trope, priority, spice != null].filter(Boolean).length}` : ''}
          </Text>
        </Press>
        {filters ? (
          <View style={{ gap: spacing.sm }}>
            {presentGenres.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              <Chip active={!trope} onPress={() => setTrope(null)}>
                Any trope
              </Chip>
              {TROPES.map((t) => (
                <Chip key={t.key} active={trope === t.key} onPress={() => setTrope(trope === t.key ? null : t.key)}>
                  {t.label}
                </Chip>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {source !== 'rec' ? (
                <Chip active={priority} onPress={() => setPriority(!priority)} icon={<StarIcon size={14} weight="fill" color={colors.gold} />}>
                  Priority only
                </Chip>
              ) : null}
              <Chip active={spice == null} onPress={() => setSpice(null)}>
                Any spice
              </Chip>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <Chip key={n} active={spice === n} onPress={() => setSpice(spice === n ? null : n)} icon={n ? <PepperIcon size={14} weight="fill" color={colors.danger} /> : undefined}>
                  {n === 0 ? 'No spice' : `${n}+`}
                </Chip>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.md, borderRadius: radius.card, backgroundColor: '#0f0d0a', paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.lg }}>
        {pool.isLoading ? (
          <Skeleton width={size * 0.9} height={size * 0.9} rounded={size} />
        ) : wedges.length === 0 ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <EmptyState
              title={(pool.data ?? []).length ? 'Nothing matches these filters' : source === 'tbr' ? 'Your wishlist is empty' : source === 'owned' ? 'No unread books you own' : 'No recommendations yet'}
              body={(pool.data ?? []).length ? 'Loosen a filter to fill the wheel.' : 'Add books to your library and the wheel fills up.'}
            />
          </View>
        ) : (
          <>
            <BookWheel ref={wheel} titles={wedges.map((w) => w.title)} size={size} reduceMotion={!!reduce} />
            <Press
              accessibilityRole="button"
              accessibilityLabel={spins <= 0 ? 'No spins left today' : used === 0 ? 'Spin the wheel' : `Reroll, ${spins} left today`}
              disabled={spinning || spins <= 0}
              onPress={() => void spin()}
              style={{ minWidth: 200, paddingHorizontal: spacing.xl, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#C9A45C', backgroundColor: '#2a1d12', alignItems: 'center', justifyContent: 'center', opacity: spinning || spins <= 0 ? 0.55 : 1 }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: spins > 0 && used === 0 ? 26 : 18, letterSpacing: 3, color: '#EBD9B4' }}>{spinning ? '…' : label}</Text>
            </Press>
            <Text variant="caption" color="#bfae8c">
              One spin and two rerolls a day · {matches.length} {matches.length === 1 ? 'book' : 'books'} match
            </Text>
            {matches.length > MAX_WEDGES && !spinning ? (
              <Press onPress={() => setSeed(seed + 1)}>
                <Text variant="caption" color="#E8C26A" style={{ fontFamily: fonts.semibold }}>
                  Shuffle the books on the wheel
                </Text>
              </Press>
            ) : null}
          </>
        )}
      </View>

      {result ? (
        <View style={{ margin: spacing.lg, flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.gold, padding: spacing.base }}>
          <Cover uri={result.cover_url} title={result.title} width={72} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="caption" tone="muted">
              The wheel chose
            </Text>
            <Text variant="bodyStrong" numberOfLines={2}>
              {result.title}
            </Text>
            <Text variant="small" tone="muted" numberOfLines={1}>
              {result.authors}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
              <Btn size="sm" loading={start.isPending} onPress={() => start.mutate(result)}>
                Start reading
              </Btn>
              <Btn size="sm" variant="secondary" onPress={() => router.push({ pathname: '/book/[id]', params: { id: result.id } })}>
                Open book
              </Btn>
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
