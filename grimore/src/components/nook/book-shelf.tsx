import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { ShelfPlank } from '@/components/ornaments';
import { BookCover } from '@/components/ui';
import { layout, shelfWoods, spacing, type ShelfWoodId } from '@/theme';

type ShelfBook = { id: string; title: string; cover_url: string | null; authors?: string | null };

/** Books standing on a wooden plank, scrolling sideways like a real shelf. */
export function BookShelf({ books, wood = 'oak', width = 84, bleed = true }: { books: ShelfBook[]; wood?: ShelfWoodId; width?: number; bleed?: boolean }) {
  const w = shelfWoods[wood];
  return (
    <View style={bleed ? { marginHorizontal: -layout.screenPadding } : undefined}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: bleed ? layout.screenPadding : 0, gap: spacing.md, alignItems: 'flex-end' }}>
        {books.map((b, i) => (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel={`${b.title}${b.authors ? `, ${b.authors}` : ''}`}
            onPress={() => router.push({ pathname: '/book/[id]', params: { id: b.id } })}
            style={({ pressed }) => ({ transform: [{ translateY: pressed ? -4 : 0 }, { rotate: i % 7 === 3 ? '-3deg' : '0deg' }] })}
          >
            <BookCover title={b.title} author={b.authors} uri={b.cover_url} width={i % 5 === 1 ? width * 0.9 : width} accessible={false} />
          </Pressable>
        ))}
      </ScrollView>
      <ShelfPlank top={w.top} edge={w.edge} style={{ marginHorizontal: bleed ? layout.screenPadding - 6 : -6 }} />
    </View>
  );
}
