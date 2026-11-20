import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { CaretRightIcon } from '@/components/icons';
import { Cover, Press, SectionHead, Text } from '@/components/ui';
import { LibraryScene, type SceneId } from '@/components/scene';
import type { Community } from '@/services/communities';
import { fonts, radius, spacing, useTheme } from '@/theme';

type B = { id: string; title: string; cover_url: string | null; authors?: string | null };

export const openBook = (id: string) => router.push({ pathname: '/book/[id]', params: { id } });

export function BookShelfRow({ title, books, width = 96, numbered, action, onAction }: { title: string; books: B[]; width?: number; numbered?: boolean; action?: string; onAction?: () => void }) {
  if (!books.length) return null;
  return (
    <View style={{ marginTop: spacing.xxl }}>
      <SectionHead title={title} action={action} onAction={onAction} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: numbered ? spacing.base : spacing.md }}>
        {books.map((b, i) => (
          <Press key={b.id} onPress={() => openBook(b.id)} style={{ width }} accessibilityLabel={b.title}>
            <Cover uri={b.cover_url} title={b.title} author={b.authors} width={width} />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {numbered ? (
                <Text variant="small" tone="accent" style={{ fontFamily: fonts.bold }}>
                  {i + 1}
                </Text>
              ) : null}
              <Text variant={numbered ? 'small' : 'caption'} numberOfLines={2} style={{ flex: 1, fontFamily: fonts.medium }}>
                {b.title}
              </Text>
            </View>
            {!numbered && b.authors ? (
              <Text variant="micro" tone="muted" numberOfLines={1} style={{ fontFamily: fonts.regular }}>
                {b.authors}
              </Text>
            ) : null}
          </Press>
        ))}
      </ScrollView>
    </View>
  );
}

export function BookListRow({ book, right, onPress, subtitle }: { book: B; right?: React.ReactNode; onPress?: () => void; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      <Press onPress={onPress ?? (() => openBook(book.id))} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 }}>
        <Cover uri={book.cover_url} title={book.title} author={book.authors} width={40} shadow={false} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="body" style={{ fontFamily: fonts.medium }} numberOfLines={1}>
            {book.title}
          </Text>
          <Text variant="small" tone="muted" numberOfLines={1}>
            {subtitle ?? book.authors}
          </Text>
        </View>
        {right ? null : <CaretRightIcon size={16} color={colors.faint} />}
      </Press>
      {right}
    </View>
  );
}

export const openCommunity = (id: string) => router.push({ pathname: '/community/[id]', params: { id } });
export const priceLabel = (cents: number | null) => (cents ? `from ${(cents / 100).toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })}/month` : 'Free');

export function CommunityCover({ c, height }: { c: Pick<Community, 'cover_scene'>; height: number | string }) {
  return <LibraryScene id={(c.cover_scene as SceneId) ?? 'great-hall'} style={{ height: height as number, width: '100%' }} />;
}

export function CommunityCard({ c }: { c: Community }) {
  const { colors } = useTheme();
  return (
    <Press onPress={() => openCommunity(c.id)} style={{ width: 240, backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>
      <CommunityCover c={c} height={112} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {c.name}
          </Text>
          {c.match ? (
            <Text variant="caption" tone="accent" style={{ fontFamily: fonts.semibold }}>
              {c.match}%
            </Text>
          ) : null}
        </View>
        <Text variant="small" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
          {c.tagline ?? 'A reading community'}
        </Text>
        <Text variant="caption" style={{ fontFamily: fonts.medium, marginTop: 10 }}>
          {c.price_cents ? `${priceLabel(c.price_cents)}` : 'Free'} · {c.member_count} members
        </Text>
      </View>
    </Press>
  );
}
