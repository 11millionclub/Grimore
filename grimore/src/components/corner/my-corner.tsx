import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { BookCover, Text } from '@/components/ui';
import { coverTones, cornerThemes, fonts, radius, spacing, type CornerThemeId } from '@/theme';
import { hashString } from '@/utils/hash';

export type CornerBook = { id: string; title: string; cover_url: string | null; authors?: string | null };
export type CornerData = {
  layout: 'editorial' | 'shelf' | 'gallery';
  theme: CornerThemeId;
  arrangement: 'spine' | 'cover' | 'stack';
  featured: CornerBook | null;
  favourites: CornerBook[];
  reading: CornerBook[];
  quote: { body: string; attribution: string | null } | null;
  authors: { id: string; name: string }[];
  achievements: number;
  ownerName: string;
};

/**
 * "My Corner": a personal reading nook rendered in 2D. The reader picks a
 * backdrop, a layout and how books are arranged; content comes from their
 * favourites, current reads, saved quotes and favourite authors.
 */
export function MyCorner({ data, onEdit }: { data: CornerData; onEdit?: () => void }) {
  const t = cornerThemes[data.theme] ?? cornerThemes.ivory;
  const featured = data.featured ?? data.favourites[0] ?? data.reading[0] ?? null;
  const shelfBooks = data.favourites.filter((b) => b.id !== featured?.id);

  return (
    <View style={{ backgroundColor: t.background, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.xl, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text variant="eyebrow" style={{ color: t.muted }}>
            My Corner
          </Text>
          <Text style={{ fontFamily: fonts.serifSemibold, fontSize: 22, color: t.ink }}>{data.ownerName}’s reading nook</Text>
        </View>
        {onEdit ? (
          <Pressable accessibilityRole="button" onPress={onEdit} hitSlop={10} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, borderWidth: 1, borderColor: t.muted }}>
            <Text variant="caption" style={{ color: t.ink }}>
              Arrange
            </Text>
          </Pressable>
        ) : null}
      </View>

      {data.layout === 'editorial' && featured ? (
        <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}>
          <Pressable onPress={() => open(featured)} accessibilityRole="button" accessibilityLabel={`Featured: ${featured.title}`}>
            <BookCover title={featured.title} author={featured.authors} uri={featured.cover_url} width={112} accessible={false} />
          </Pressable>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text variant="eyebrow" style={{ color: t.accent }}>
              Featured
            </Text>
            <Text style={{ fontFamily: fonts.serifSemibold, fontSize: 19, lineHeight: 24, color: t.ink }} numberOfLines={3}>
              {featured.title}
            </Text>
            {featured.authors ? (
              <Text variant="caption" style={{ color: t.muted }}>
                {featured.authors}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {data.quote ? (
        <View style={{ gap: spacing.sm, paddingLeft: spacing.base, borderLeftWidth: 2, borderLeftColor: t.accent }}>
          <Text style={{ fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 27, color: t.ink }}>“{data.quote.body}”</Text>
          {data.quote.attribution ? (
            <Text variant="caption" style={{ color: t.muted }}>
              {data.quote.attribution}
            </Text>
          ) : null}
        </View>
      ) : null}

      {(data.layout === 'shelf' || data.layout === 'editorial') && shelfBooks.length ? (
        <Shelf books={data.layout === 'shelf' && featured ? [featured, ...shelfBooks] : shelfBooks} arrangement={data.arrangement} shelf={t.shelf} ink={t.ink} />
      ) : null}

      {data.layout === 'gallery' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {[...(featured ? [featured] : []), ...shelfBooks].slice(0, 9).map((b) => (
            <Pressable key={b.id} onPress={() => open(b)} accessibilityRole="button" accessibilityLabel={b.title}>
              <BookCover title={b.title} author={b.authors} uri={b.cover_url} width={84} accessible={false} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {data.reading.length ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="eyebrow" style={{ color: t.muted }}>
            On the nightstand
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
            {data.reading.map((b) => (
              <Pressable key={b.id} onPress={() => open(b)} accessibilityRole="button" accessibilityLabel={`Reading ${b.title}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: t.panel }}>
                <BookCover title={b.title} uri={b.cover_url} width={30} accessible={false} />
                <Text variant="callout" style={{ color: t.ink, maxWidth: 140 }} numberOfLines={2}>
                  {b.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {data.authors.length ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="eyebrow" style={{ color: t.muted }}>
            Kindred authors
          </Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, color: t.ink }}>{data.authors.map((a) => a.name).join('  ·  ')}</Text>
        </View>
      ) : null}

      {!featured && !data.quote && !data.reading.length ? (
        <Text variant="callout" style={{ color: t.muted }}>
          An empty corner, waiting for its first books. Add favourites, a quote you love, or the authors who shaped you.
        </Text>
      ) : null}
    </View>
  );
}

function open(b: CornerBook) {
  router.push({ pathname: '/book/[id]', params: { id: b.id } });
}

/** A wooden shelf. Books stand as spines, face out as covers, or lie stacked. */
function Shelf({ books, arrangement, shelf, ink }: { books: CornerBook[]; arrangement: CornerData['arrangement']; shelf: string; ink: string }) {
  return (
    <View>
      <View style={{ flexDirection: arrangement === 'stack' ? 'column' : 'row', alignItems: arrangement === 'stack' ? 'flex-start' : 'flex-end', flexWrap: arrangement === 'cover' ? 'wrap' : 'nowrap', gap: arrangement === 'spine' ? 3 : spacing.sm, minHeight: 60 }}>
        {books.slice(0, arrangement === 'stack' ? 6 : 10).map((b, i) => {
          const tone = coverTones[hashString(b.title) % coverTones.length];
          if (arrangement === 'cover') {
            return (
              <Pressable key={b.id} onPress={() => open(b)} accessibilityRole="button" accessibilityLabel={b.title}>
                <BookCover title={b.title} author={b.authors} uri={b.cover_url} width={64} accessible={false} />
              </Pressable>
            );
          }
          if (arrangement === 'stack') {
            const w = 150 + ((hashString(b.id) % 5) - 2) * 14;
            return (
              <Pressable key={b.id} onPress={() => open(b)} accessibilityRole="button" accessibilityLabel={b.title} style={{ width: w, height: 22, backgroundColor: tone.bg, borderRadius: 2, justifyContent: 'center', paddingHorizontal: spacing.sm, marginLeft: (i % 3) * 6 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.serifSemibold, fontSize: 10.5, color: tone.ink, letterSpacing: 0.4 }}>
                  {b.title}
                </Text>
              </Pressable>
            );
          }
          const h = 108 + (hashString(b.id) % 4) * 9;
          const w = 26 + (hashString(b.title) % 3) * 4;
          return (
            <Pressable key={b.id} onPress={() => open(b)} accessibilityRole="button" accessibilityLabel={b.title} style={{ width: w, height: h, backgroundColor: tone.bg, borderRadius: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: 8, left: 3, right: 3, height: 1, backgroundColor: tone.ink, opacity: 0.4 }} />
              <View style={{ position: 'absolute', bottom: 8, left: 3, right: 3, height: 1, backgroundColor: tone.ink, opacity: 0.4 }} />
              <Text numberOfLines={1} style={{ width: h - 24, transform: [{ rotate: '-90deg' }], textAlign: 'center', fontFamily: fonts.serifSemibold, fontSize: 10, color: tone.ink, letterSpacing: 0.3 }}>
                {b.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {arrangement !== 'stack' ? <View style={{ height: 8, backgroundColor: shelf, borderRadius: 2, marginTop: 2, boxShadow: `0 4px 6px rgba(0,0,0,0.12)` }} /> : <View style={{ height: 1, backgroundColor: ink, opacity: 0.2, marginTop: spacing.xs }} />}
    </View>
  );
}
