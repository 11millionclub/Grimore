import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { CaretRightIcon, CheckIcon, CoinsIcon, LockSimpleIcon } from '@/components/icons';
import { LibraryRoom, SCENE_IDS, SCENES, type LibraryScene, type ShelfBook } from '@/components/library-room';
import { Btn, Chip, Press, Text, toast } from '@/components/ui';
import { usePaywalls } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { getPurchases, saveCorner } from '@/services/corner';
import { myItems } from '@/services/houses';
import { listWholeLibrary, type LibraryEntry } from '@/services/library';
import { fonts, GILT, radius, spacing, useTheme } from '@/theme';

export type LibraryFilter = 'all' | 'read' | 'reading' | 'owned' | 'want';
export const LIBRARY_FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'read', label: 'Finished' },
  { id: 'reading', label: 'Reading' },
  { id: 'owned', label: 'Owned' },
  { id: 'want', label: 'TBR' },
];

const toShelf = (e: LibraryEntry): ShelfBook => ({ id: e.book.id, title: e.book.title, authors: e.book.authors, year: e.book.first_published_year, pages: e.book.page_count_estimate, cover_url: e.book.cover_url, featured: e.status === 'reading' });

export const isScene = (v: string | null | undefined): v is LibraryScene => !!v && v in SCENES;

/**
 * Everything a library view needs: the whole library (paginated, no cap)
 * filtered for the shelves, the chosen room, which rooms are open (all of
 * them while paywalls are off) and the locked-room sheet state.
 */
export function useLibrary(userId: string, isMe: boolean, saved?: string | null) {
  const qc = useQueryClient();
  const lib = useQuery({ queryKey: qk.library(`${userId}:all`), queryFn: () => listWholeLibrary(userId) });
  const items = useQuery({ queryKey: ['myItems', userId], queryFn: () => myItems(userId), enabled: isMe });
  const bought = useQuery({ queryKey: ['purchases', userId], queryFn: () => getPurchases(userId), enabled: isMe });
  const paywalls = usePaywalls();
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [preview, setPreview] = useState<LibraryScene | null>(null);
  const current: LibraryScene = isScene(saved) ? saved : 'classic';
  const ownsScene = (s: LibraryScene) => !paywalls || s === 'classic' || (items.data ?? []).some((x) => x.item_key === `library:${s}`) || (bought.data ?? []).includes(`library:${s}`);

  const books = useMemo(() => {
    const keep = (e: LibraryEntry) =>
      filter === 'read' ? e.status === 'read' : filter === 'reading' ? e.status === 'reading' : filter === 'owned' ? e.is_owned : filter === 'want' ? e.status === 'want_to_read' : e.status !== 'want_to_read' || e.is_owned;
    return (lib.data ?? []).filter(keep).map(toShelf);
  }, [filter, lib.data]);

  const choose = useMutation({
    mutationFn: (s: LibraryScene) => saveCorner(userId, { library: s }),
    onSuccess: (_d, s) => {
      setPreview(null);
      void qc.invalidateQueries({ queryKey: qk.corner(userId) });
      toast(`${SCENES[s].name} is your library now`);
    },
    onError: (e) => toast(toAppError(e).message),
  });

  const pick = (s: LibraryScene) => {
    if (!isMe) return;
    if (ownsScene(s)) {
      if (s !== current) choose.mutate(s);
      return;
    }
    setPreview(s);
  };

  return { books, loading: lib.isLoading, filter, setFilter, current, shown: preview ?? current, preview, closePreview: () => setPreview(null), ownsScene, pick };
}

/** Filter chips for the shelves. */
export function LibraryFilters({ value, onChange, glass }: { value: LibraryFilter; onChange: (f: LibraryFilter) => void; glass?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
      {LIBRARY_FILTERS.map((f) =>
        glass ? (
          <Press key={f.id} accessibilityState={{ selected: value === f.id }} onPress={() => onChange(f.id)} style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', borderWidth: 1, borderColor: value === f.id ? GILT.gold : 'rgba(232,209,155,0.35)', backgroundColor: value === f.id ? 'rgba(198,154,67,0.9)' : 'rgba(16,13,11,0.62)' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: value === f.id ? GILT.black : GILT.ivory }}>{f.label}</Text>
          </Press>
        ) : (
          <Chip key={f.id} active={value === f.id} onPress={() => onChange(f.id)}>
            {f.label}
          </Chip>
        ),
      )}
    </ScrollView>
  );
}

/** Thumbnails of the four rooms; locked ones carry a padlock. */
export function RoomPicker({ current, ownsScene, onPick, size = 112 }: { current: LibraryScene; ownsScene: (s: LibraryScene) => boolean; onPick: (s: LibraryScene) => void; size?: number }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
      {SCENE_IDS.map((s) => {
        const mine = ownsScene(s);
        const on = s === current;
        return (
          <Press key={s} accessibilityLabel={`${SCENES[s].name}${on ? ', in use' : mine ? '' : ', locked'}`} onPress={() => onPick(s)} style={{ width: size, gap: 4 }}>
            <View style={{ width: size, height: size * 0.7, borderRadius: radius.tile, overflow: 'hidden', borderWidth: on ? 2 : 1, borderColor: on ? GILT.gold : colors.line }}>
              <Image source={SCENES[s].image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              {!mine ? (
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
                  <LockSimpleIcon size={20} weight="fill" color="#fff" />
                </View>
              ) : on ? (
                <View style={{ position: 'absolute', right: 4, top: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: GILT.gold, alignItems: 'center', justifyContent: 'center' }}>
                  <CheckIcon size={12} weight="bold" color={GILT.black} />
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
  );
}

/** The sheet for a locked room: unlock with points, or buy once purchases open. */
export function LockedRoomSheet({ scene, onClose }: { scene: LibraryScene | null; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Modal visible={!!scene} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: spacing.lg, gap: spacing.md, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          {scene ? (
            <>
              <View style={{ height: 160, borderRadius: radius.tile, overflow: 'hidden' }}>
                <Image source={SCENES[scene].image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
              <Text variant="h2">{SCENES[scene].name}</Text>
              <Text variant="small" tone="muted">
                Your first library is free. Unlock this room with the points you win in the daily games, or buy it once purchases open.
              </Text>
              <Btn
                icon={<CoinsIcon size={18} color={colors.onAccent} />}
                onPress={() => {
                  onClose();
                  router.push('/points');
                }}
              >
                Unlock with 900 points
              </Btn>
              <Btn variant="secondary" disabled>
                Buy for €1.99 · coming soon
              </Btn>
              <Btn variant="ghost" onPress={onClose}>
                Not now
              </Btn>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Another reader's library, as a card on their profile. */
export function LibraryPanel({ userId, scene: saved }: { userId: string; scene?: string | null }) {
  const lib = useLibrary(userId, false, saved);
  return (
    <View style={{ gap: spacing.md, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <LibraryRoom scene={lib.shown} books={lib.books} empty="No books on these shelves yet." />
      </View>
      <LibraryFilters value={lib.filter} onChange={lib.setFilter} />
    </View>
  );
}

/** On your own profile: the way into your library, which has its own tab. */
export function EnterGrimoreCard({ scene }: { scene?: string | null }) {
  const s: LibraryScene = isScene(scene) ? scene : 'classic';
  return (
    <Press accessibilityLabel="Open your library" onPress={() => router.navigate('/grimore')} style={{ marginHorizontal: spacing.lg, height: 150, borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: GILT.gold, maxWidth: 760, alignSelf: 'stretch' }}>
      <Image source={SCENES[s].image} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
      <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(16,13,11,0.45)' }} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', padding: spacing.base }}>
        <View>
          <Text style={{ fontFamily: fonts.serifBold, fontSize: 26, color: GILT.ivory }}>Enter your library</Text>
          <Text variant="small" color={GILT.champagne}>
            {SCENES[s].name} · your shelves, sagas and reading sessions
          </Text>
        </View>
        <CaretRightIcon size={18} color={GILT.champagne} />
      </View>
    </Press>
  );
}
