import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { BookSearch } from '@/components/book-search';
import { TopBar } from '@/components/top-bar';
import { Icon, Screen, Surface, Text } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { qk } from '@/lib/query-client';
import { saveEntry } from '@/services/library';
import { spacing, useTheme } from '@/theme';

export default function AddBook() {
  const userId = useMyId()!;
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar mode="close" title="Add a book" />
      <Screen keyboard edgeTop={false}>
        <BookSearch
          autoFocus
          onSelect={async (book) => {
            await saveEntry(userId, book.id, { status: 'want_to_read' });
            void queryClient.invalidateQueries({ queryKey: qk.libraryAll });
            router.replace({ pathname: '/book/[id]', params: { id: book.id } });
          }}
          emptyHint={
            <View style={{ gap: spacing.base, marginTop: spacing.sm }}>
              <Text variant="callout" tone="muted">
                Search by title, author, or type the ISBN printed above the barcode. Results come from the GriMore catalogue, Open Library and Google Books.
              </Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/add-book-manual')}>
                <Surface style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Icon name="edit-3" size={18} tone="accent" />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">Add it by hand</Text>
                    <Text variant="caption">For rare, self-published or out-of-print books.</Text>
                  </View>
                  <Icon name="chevron-right" size={18} tone="inkSubtle" />
                </Surface>
              </Pressable>
              <Surface muted style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Icon name="camera" size={18} tone="inkMuted" />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" tone="muted">
                    Shelf scanning
                  </Text>
                  <Text variant="caption">Coming soon: photograph a shelf or a barcode to import many books at once.</Text>
                </View>
              </Surface>
            </View>
          }
        />
      </Screen>
    </View>
  );
}
