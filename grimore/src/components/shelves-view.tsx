import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { CaretRightIcon } from '@/components/icons';
import { Btn, Cover, Press, Text } from '@/components/ui';
import { useShelf } from '@/hooks/queries';
import { listShelves } from '@/services/library';
import { radius, spacing, useTheme } from '@/theme';

type Card = { id: string; name: string; count: number; covers: { id: string; title: string; cover_url: string | null }[] };

function ShelfCard({ s }: { s: Card }) {
  const { colors } = useTheme();
  return (
    <Press onPress={() => router.push({ pathname: '/shelf/[id]', params: { id: s.id, name: s.name } })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }}>
      <View style={{ width: 86, height: 64 }}>
        {s.covers.slice(0, 3).map((b, i) => (
          <View key={b.id} style={{ position: 'absolute', bottom: 0, left: i * 22, zIndex: 3 - i, transform: [{ rotate: `${(i - 1) * 4}deg` }] }}>
            <Cover uri={b.cover_url} title={b.title} width={42} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" style={{ fontSize: 16 }}>
          {s.name}
        </Text>
        <Text variant="small" tone="muted">
          {s.count} {s.count === 1 ? 'book' : 'books'}
        </Text>
      </View>
      <CaretRightIcon size={16} color={colors.muted} />
    </Press>
  );
}

export function ShelvesView({ userId, isMe }: { userId: string; isMe: boolean }) {
  const reading = useShelf(userId, 'reading');
  const read = useShelf(userId, 'read');
  const want = useShelf(userId, 'want_to_read');
  const owned = useShelf(userId, 'owned');
  const dnf = useShelf(userId, 'dnf');
  const custom = useQuery({ queryKey: ['shelves', userId], queryFn: () => listShelves(userId) });
  const base: Card[] = [
    { id: `${userId}:reading`, name: 'Reading', data: reading.data },
    { id: `${userId}:read`, name: 'Read', data: read.data },
    { id: `${userId}:want_to_read`, name: 'Want to read', data: want.data },
    { id: `${userId}:owned`, name: 'On my shelf', data: owned.data },
    { id: `${userId}:dnf`, name: 'Abandoned', data: dnf.data },
  ].map((s) => ({ id: s.id, name: s.name, count: s.data?.length ?? 0, covers: (s.data ?? []).slice(0, 3).map((e) => e.book) }));
  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingTop: spacing.sm }}>
      {base.filter((s) => s.count > 0 || ['Read', 'Want to read'].includes(s.name)).map((s) => (
        <ShelfCard key={s.id} s={s} />
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
