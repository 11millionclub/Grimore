import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { CheckIcon, CoinsIcon, LockSimpleIcon, SpiralIcon, TimerIcon } from '@/components/icons';
import { LibraryRoom, SCENE_IDS, SCENES, type LibraryScene, type ShelfBook } from '@/components/library-room';
import { Btn, Chip, Press, Text, toast } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { getPurchases, saveCorner } from '@/services/corner';
import { myItems } from '@/services/houses';
import { listWholeLibrary, type LibraryEntry } from '@/services/library';
import { useReadingSession } from '@/stores/reading-session';
import { fonts, radius, spacing, useTheme } from '@/theme';

type Filter = 'all' | 'read' | 'reading' | 'owned' | 'want';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'read', label: 'Finished' },
  { id: 'reading', label: 'Reading' },
  { id: 'owned', label: 'Owned' },
  { id: 'want', label: 'Wishlist' },
];

const toShelf = (e: LibraryEntry): ShelfBook => ({ id: e.book.id, title: e.book.title, authors: e.book.authors, year: e.book.first_published_year, pages: e.book.page_count_estimate, cover_url: e.book.cover_url, featured: e.status === 'reading' });

export const isScene = (v: string | null | undefined): v is LibraryScene => !!v && v in SCENES;

/**
 * The top of My Grimore: your library room with your books on its shelves,
 * the room picker (the Classic room is free, others are unlocked), and the
 * reading-session timer and "what to read next" wheel.
 */
export function LibraryPanel({ userId, isMe, scene: saved }: { userId: string; isMe: boolean; scene?: string | null }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  // One paginated read of the whole library (no 200-book cap); filters run on it.
  const lib = useQuery({ queryKey: qk.library(`${userId}:all`), queryFn: () => listWholeLibrary(userId) });
  const items = useQuery({ queryKey: ['myItems', userId], queryFn: () => myItems(userId), enabled: isMe });
  const bought = useQuery({ queryKey: ['purchases', userId], queryFn: () => getPurchases(userId), enabled: isMe });
  const [filter, setFilter] = useState<Filter>('all');
  const sessionOn = useReadingSession((st) => st.active);
  const [preview, setPreview] = useState<LibraryScene | null>(null);
  const [locked, setLocked] = useState<LibraryScene | null>(null);
  const current: LibraryScene = isScene(saved) ? saved : 'classic';
  const shown = preview ?? current;

  const ownsScene = (s: LibraryScene) => s === 'classic' || (items.data ?? []).some((x) => x.item_key === `library:${s}`) || (bought.data ?? []).includes(`library:${s}`);

  const books = useMemo(() => {
    const all = lib.data ?? [];
    const keep = (e: LibraryEntry) =>
      filter === 'read' ? e.status === 'read' : filter === 'reading' ? e.status === 'reading' : filter === 'owned' ? e.is_owned : filter === 'want' ? e.status === 'want_to_read' : e.status !== 'want_to_read' || e.is_owned;
    return all.filter(keep).map(toShelf);
  }, [filter, lib.data]);

  const choose = useMutation({
    mutationFn: (s: LibraryScene) => saveCorner(userId, { library: s }),
    onSuccess: (_d, s) => {
      setPreview(null);
      void qc.invalidateQueries({ queryKey: ['corner', userId] });
      toast(`${SCENES[s].name} is your library now`);
    },
    onError: (e) => toast(toAppError(e).message),
  });

  const tap = (s: LibraryScene) => {
    if (!isMe) return;
    if (ownsScene(s)) {
      if (s !== current) choose.mutate(s);
      return;
    }
    setPreview(s);
    setLocked(s);
  };

  return (
    <View style={{ gap: spacing.md, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <LibraryRoom scene={shown} books={books} locked={!!preview && !ownsScene(preview)} empty={isMe ? 'Your shelves are waiting. Add books you own or have finished and they will appear here, grouped by saga.' : 'No books on these shelves yet.'} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} active={filter === f.id} onPress={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
      </ScrollView>

      {isMe ? (
        <>
          <View style={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
            <Btn full icon={<TimerIcon size={18} color={colors.onAccent} />} onPress={() => router.push('/reading-session')}>
              {sessionOn ? 'Session running' : 'Start reading session'}
            </Btn>
            <Btn full variant="secondary" icon={<SpiralIcon size={18} color={colors.ink} />} onPress={() => router.push('/wheel')}>
              What should I read next?
            </Btn>
          </View>

          <View>
            <Text variant="small" tone="muted" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
              Libraries
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              {SCENE_IDS.map((s) => {
                const mine = ownsScene(s);
                const on = s === current;
                return (
                  <Press key={s} accessibilityRole="button" accessibilityLabel={`${SCENES[s].name}${on ? ', in use' : mine ? '' : ', locked'}`} onPress={() => tap(s)} style={{ width: 112, gap: 4 }}>
                    <View style={{ width: 112, height: 78, borderRadius: radius.tile, overflow: 'hidden', borderWidth: on ? 2 : 1, borderColor: on ? colors.accent : colors.line }}>
                      <Image source={SCENES[s].image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      {!mine ? (
                        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
                          <LockSimpleIcon size={20} weight="fill" color="#fff" />
                        </View>
                      ) : on ? (
                        <View style={{ position: 'absolute', right: 4, top: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                          <CheckIcon size={12} weight="bold" color={colors.onAccent} />
                        </View>
                      ) : null}
                    </View>
                    <Text variant="caption" numberOfLines={1} style={{ fontFamily: on ? fonts.semibold : fonts.regular }}>
                      {SCENES[s].name}
                    </Text>
                  </Press>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : null}

      <Modal visible={!!locked} transparent animationType="fade" onRequestClose={() => (setLocked(null), setPreview(null))}>
        <Pressable onPress={() => (setLocked(null), setPreview(null))} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: spacing.lg, gap: spacing.md, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
            {locked ? (
              <>
                <View style={{ height: 160, borderRadius: radius.tile, overflow: 'hidden' }}>
                  <Image source={SCENES[locked].image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
                <Text variant="h2">{SCENES[locked].name}</Text>
                <Text variant="small" tone="muted">
                  Your first library is free. Unlock this room with the points you win in the daily games, or buy it once purchases open.
                </Text>
                <Btn
                  icon={<CoinsIcon size={18} color={colors.onAccent} />}
                  onPress={() => {
                    setLocked(null);
                    setPreview(null);
                    router.push('/points');
                  }}
                >
                  Unlock with 900 points
                </Btn>
                <Btn variant="secondary" disabled>
                  Buy for €1.99 · coming soon
                </Btn>
                <Btn variant="ghost" onPress={() => (setLocked(null), setPreview(null))}>
                  Not now
                </Btn>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
