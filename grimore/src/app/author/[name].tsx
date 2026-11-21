import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { openBook } from '@/components/books';
import { CheckCircleIcon } from '@/components/icons';
import { Cover, EmptyState, Press, Screen, SectionHead, Text } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { booksByAuthor, myBookIds } from '@/services/discover';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function Author() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const q = useQuery({ queryKey: ['author', name], queryFn: () => booksByAuthor(name) });
  const mine = useQuery({ queryKey: ['myBookIds', me], queryFn: () => myBookIds(me) });
  const initials = name
    .split(' ')
    .filter((p) => /^[A-ZÀ-Ý]/.test(p) && !p.endsWith('.'))
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
  const books = q.data?.books ?? [];
  const first = books.find((b) => b.first_published_year)?.first_published_year;
  return (
    <Screen title={name} large={false} back>
      <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 32 }} tone="accent">
            {initials}
          </Text>
        </View>
        <Text accessibilityRole="header" align="center" style={{ fontFamily: fonts.bold, fontSize: 28, lineHeight: 30, marginTop: spacing.base }}>
          {name}
        </Text>
        <Text variant="callout" tone="muted" style={{ marginTop: 4 }}>
          {books.length} {books.length === 1 ? 'book' : 'books'} on Grimore{first ? ` · publishing since ${first}` : ''}
        </Text>
        {q.data?.author?.bio ? (
          <Text variant="callout" align="center" style={{ marginTop: spacing.md }}>
            {q.data.author.bio}
          </Text>
        ) : null}
      </View>
      <SectionHead title="Books" />
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {!q.isLoading && books.length === 0 ? <EmptyState title="No books yet" /> : null}
        {books.map((b) => (
          <Press key={b.id} onPress={() => openBook(b.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
            <Cover uri={b.cover_url} title={b.title} author={b.authors} width={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {b.title}
              </Text>
              <Text variant="small" tone="muted">
                {[b.first_published_year, b.pages ? `${b.pages} pages` : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {mine.data?.has(b.id) ? <CheckCircleIcon size={20} weight="fill" color={colors.good} /> : null}
          </Press>
        ))}
      </View>
    </Screen>
  );
}
