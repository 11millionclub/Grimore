import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { CaretRightIcon, StarIcon } from '@/components/icons';
import { Btn, Cover, Press, Text } from '@/components/ui';
import { useShelfCount } from '@/hooks/queries';
import { qk } from '@/lib/query-client';
import { listByStatus, listShelves } from '@/services/library';
import { fonts, radius, spacing, useTheme } from '@/theme';

type Status = Parameters<typeof listByStatus>[1];
type Card = { id: string; name: string; count: number; covers: { id: string; title: string; cover_url: string | null }[]; star?: boolean };

/** Three covers is all a shelf card shows, so that is all it asks for. */
function useShelfPreview(userId: string, status: Status) {
  return useQuery({ queryKey: qk.library(`${userId}:${status}:preview`), queryFn: () => listByStatus(userId, status, 3) });
}

function ShelfCard({ s }: { s: Card }) {
  const { colors } = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${s.name}, ${s.count} ${s.count === 1 ? 'book' : 'books'}`}
      onPress={() => router.push({ pathname: '/shelf/[id]', params: { id: s.id, name: s.name } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: s.star ? colors.gold : colors.line, padding: 14 }}
    >
      <View style={{ flexDirection: 'row', gap: 4, width: 3 * 38 + 8 }}>
        {s.covers.slice(0, 3).map((b) => (
          <Cover key={b.id} uri={b.cover_url} title={b.title} width={38} shadow={false} />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {s.star ? <StarIcon size={14} weight="fill" color={colors.gold} /> : null}
          <Text style={{ fontFamily: fonts.serifBold, fontSize: 19 }}>{s.name}</Text>
        </View>
        <Text variant="small" tone="muted">
          {s.count} {s.count === 1 ? 'book' : 'books'}
        </Text>
      </View>
      <CaretRightIcon size={16} color={colors.muted} />
    </Press>
  );
}

const BASE: { status: Status; name: string; always?: boolean; star?: boolean }[] = [
  { status: 'reading', name: 'Reading' },
  { status: 'priority', name: 'Priority', star: true },
  { status: 'tbr', name: 'TBR', always: true },
  { status: 'wishlist', name: 'Wishlist', always: true },
  { status: 'read', name: 'Finished', always: true },
  { status: 'owned', name: 'Owned' },
  { status: 'on_hold', name: 'Paused' },
  { status: 'dnf', name: 'DNF' },
];

function StatusShelf({ userId, status, name, always, star }: { userId: string; status: Status; name: string; always?: boolean; star?: boolean }) {
  const preview = useShelfPreview(userId, status);
  const count = useShelfCount(userId, status);
  const n = count.data ?? preview.data?.length ?? 0;
  if (!n && !always) return null;
  return <ShelfCard s={{ id: `${userId}:${status}`, name, count: n, covers: (preview.data ?? []).map((e) => e.book), star }} />;
}

/** Every shelf as one list: status shelves (Priority among them), then your own. */
export function ShelvesView({ userId, isMe }: { userId: string; isMe: boolean }) {
  const custom = useQuery({ queryKey: ['shelves', userId], queryFn: () => listShelves(userId) });
  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingTop: spacing.sm }}>
      {BASE.map((b) => (
        <StatusShelf key={b.status} userId={userId} {...b} />
      ))}
      {(custom.data ?? []).map((s) => (
        <ShelfCard key={s.id} s={{ id: s.id, name: s.title, count: s.count, covers: s.covers }} />
      ))}
      {isMe ? (
        <Btn variant="ghost" full style={{ marginTop: spacing.sm }} onPress={() => router.push('/shelves/new')}>
          New shelf
        </Btn>
      ) : null}
    </View>
  );
}
