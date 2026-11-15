import { router } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';

import { BookCover, Skeleton, Text } from '@/components/ui';
import { layout, spacing } from '@/theme';

export type ShelfBook = { id: string; title: string; cover_url: string | null; authors?: string | null };

/** Horizontal shelf of covers that bleeds to the screen edges. */
export function Shelf({ books, loading, width = 104, onPress }: { books: ShelfBook[]; loading?: boolean; width?: number; onPress?: (b: ShelfBook) => void }) {
  if (loading) {
    return (
      <View style={{ flexDirection: 'row', gap: spacing.base }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ gap: spacing.sm }}>
            <Skeleton width={width} height={width * 1.5} />
            <Skeleton width={width * 0.8} height={10} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <FlatList
      horizontal
      data={books}
      keyExtractor={(b) => b.id}
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -layout.screenPadding }}
      contentContainerStyle={{ paddingHorizontal: layout.screenPadding, gap: spacing.base }}
      initialNumToRender={5}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}${item.authors ? `, ${item.authors}` : ''}`}
          onPress={() => (onPress ? onPress(item) : router.push({ pathname: '/book/[id]', params: { id: item.id } }))}
          style={({ pressed }) => ({ width, gap: spacing.sm, opacity: pressed ? 0.75 : 1 })}
        >
          <BookCover title={item.title} author={item.authors} uri={item.cover_url} width={width} accessible={false} />
          <View style={{ gap: 1 }}>
            <Text variant="bookTitle" numberOfLines={2} style={{ fontSize: 14, lineHeight: 18 }}>
              {item.title}
            </Text>
            {item.authors ? (
              <Text variant="caption" numberOfLines={1}>
                {item.authors}
              </Text>
            ) : null}
          </View>
        </Pressable>
      )}
    />
  );
}
