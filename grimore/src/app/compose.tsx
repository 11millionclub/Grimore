import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReviewTagPicker } from '@/components/review-tags';
import { Toggle } from '@/components/switch';
import { BookOpenIcon, CaretRightIcon, EyeSlashIcon, FeatherIcon, QuotesIcon, StarIcon, type IconProps } from '@/components/icons';
import { Btn, Cover, Press, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { myCommunities } from '@/services/communities';
import { refreshLibrary } from '@/lib/query-client';
import { listByStatus, saveEntry, statusPatch } from '@/services/library';
import { createPost, upsertReview } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { STAR_STEPS } from '@/utils/ratings';

/**
 * Reviews are public. Posts and quotes only live inside a community, so
 * choosing one of them asks which community it is for.
 */
type Kind = 'review' | 'quote' | 'free';
const KINDS: { id: Kind; label: string; Icon: ComponentType<IconProps> }[] = [
  { id: 'review', label: 'Review', Icon: StarIcon },
  { id: 'free', label: 'Community post', Icon: FeatherIcon },
  { id: 'quote', label: 'Quote', Icon: QuotesIcon },
];

export default function Compose() {
  const params = useLocalSearchParams<{ kind?: Kind; bookId?: string; communityId?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMyId()!;
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>(params.kind && params.kind in { review: 1, quote: 1, free: 1 } ? params.kind : params.communityId ? 'free' : 'review');
  const [bookId, setBookId] = useState<string | null>(params.bookId ?? null);
  // null = use the stars you already gave the chosen book in your library.
  const [picked, setStars] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
    const [communityId, setCommunityId] = useState<string | null>(params.communityId ?? null);
  const [picking, setPicking] = useState(false);
  const books = useQuery({
    queryKey: ['compose-books', me],
    queryFn: async () => [...(await listByStatus(me, 'reading', 30)), ...(await listByStatus(me, 'read', 60))],
  });
  const comms = useQuery({ queryKey: ['my-communities', me], queryFn: () => myCommunities(me) });
  // Free posts are about anything (an author, an idea…); a book is optional and only tagged when chosen.
  const book = (books.data ?? []).find((e) => e.book.id === bookId)?.book ?? (kind === 'free' ? undefined : books.data?.[0]?.book);
  const entryOf = (books.data ?? []).find((e) => e.book.id === book?.id);
  const stars = picked ?? Number(entryOf?.rating ?? 0);
  const ok = kind === 'review' ? !!book && stars > 0 : !!communityId && text.trim().length > 2 && (kind !== 'quote' || !!book);

  const publish = useMutation({
    mutationFn: async () => {
      if (kind === 'review') {
        await upsertReview({ userId: me, bookId: book!.id, rating: stars, body: text, hasSpoilers: spoiler, tags });
        // Same as the review screen: the stars become the book's rating and the book counts as finished.
        await saveEntry(me, book!.id, { rating: stars, ...(entryOf?.status === 'read' ? {} : statusPatch('read', entryOf ?? null)) });
        return;
      }
      return createPost({ userId: me, kind: kind === 'quote' ? 'quote' : 'free', bookId: book?.id ?? null, quote: kind === 'quote' ? text : null, body: kind === 'free' ? text : null, hasSpoilers: spoiler, audience: 'community', communityId });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      if (kind === 'review') void refreshLibrary(qc);
      router.back();
      toast('Published');
    },
    onError: (e) => toast(toAppError(e).message),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Press onPress={() => router.back()} style={{ height: 40, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
          <Text variant="body" tone="muted" style={{ fontFamily: fonts.medium }}>
            Cancel
          </Text>
        </Press>
        <Text variant="bodyStrong">{kind === 'review' ? 'New review' : 'New community post'}</Text>
        <Btn size="sm" disabled={!ok} loading={publish.isPending} onPress={() => publish.mutate()}>
          Publish
        </Btn>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.base, paddingBottom: insets.bottom + spacing.xxl }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {KINDS.map(({ id, label, Icon }) => (
            <Press key={id} onPress={() => setKind(id)} style={{ height: 36, paddingHorizontal: 14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: kind === id ? colors.ink : colors.surface2 }}>
              <Icon size={15} weight={kind === id ? 'fill' : 'regular'} color={kind === id ? colors.bg : colors.ink} />
              <Text variant="small" style={{ fontFamily: fonts.semibold }} color={kind === id ? colors.bg : colors.ink}>
                {label}
              </Text>
            </Press>
          ))}
        </ScrollView>

        {kind === 'free' ? (
          <Press onPress={() => (book ? setBookId(null) : setPicking(!picking))} style={{ marginTop: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'flex-start', borderRadius: radius.full, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, height: 36 }}>
            <BookOpenIcon size={16} color={colors.muted} />
            <Text variant="small" tone="muted" numberOfLines={1}>
              {book ? `About ${book.title} · remove` : 'Tag a book (optional)'}
            </Text>
          </Press>
        ) : (
          <Press onPress={() => setPicking(!picking)} style={{ marginTop: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
            {book ? <Cover uri={book.cover_url} title={book.title} width={40} /> : null}
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {book?.title ?? 'Pick a book from your library'}
              </Text>
              <Text variant="small" tone="muted">
                Tap to change book
              </Text>
            </View>
            <CaretRightIcon size={16} color={colors.muted} style={{ transform: [{ rotate: picking ? '90deg' : '0deg' }] }} />
          </Press>
        )}
        {picking ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md }}>
            {(books.data ?? []).map((e) => (
              <Press
                key={e.id}
                onPress={() => {
                  setBookId(e.book.id);
                  setStars(null);
                  setPicking(false);
                }}
                style={{ opacity: book?.id === e.book.id ? 1 : 0.6 }}
              >
                <Cover uri={e.book.cover_url} title={e.book.title} width={56} />
              </Press>
            ))}
          </ScrollView>
        ) : null}

        {kind === 'review' ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: spacing.lg }}>
            {STAR_STEPS.map((i) => (
              <Press key={i} accessibilityLabel={`${i} stars`} onPress={() => setStars(i)} style={{ padding: 3 }}>
                <StarIcon size={32} weight="fill" color={i <= stars ? colors.gold : colors.surface3} />
              </Press>
            ))}
          </View>
        ) : null}
        <TextInput
          autoFocus
          value={text}
          onChangeText={(v) => setText(v.slice(0, 1000))}
          multiline
          placeholder={{ review: 'What did you think?', quote: 'Type the line, or photograph the page from +', free: 'What are you thinking about?' }[kind]}
          placeholderTextColor={colors.faint}
          selectionColor={colors.accent}
          style={{ marginTop: spacing.lg, minHeight: kind === 'quote' ? 120 : 180, color: colors.ink, fontFamily: kind === 'quote' ? fonts.medium : fonts.regular, fontSize: kind === 'quote' ? 22 : 17, lineHeight: kind === 'quote' ? 29 : 25, textAlignVertical: 'top' }}
        />
        <Text variant="caption" tone="faint" align="right">
          {text.length}/1000
        </Text>
        {kind === 'review' ? (
          <View style={{ marginTop: spacing.base }}>
            <ReviewTagPicker value={tags} onChange={setTags} />
          </View>
        ) : null}

        <View style={{ marginTop: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base }}>
            <EyeSlashIcon size={20} color={colors.muted} />
            <Text style={{ flex: 1 }}>Contains spoilers</Text>
            <Toggle value={spoiler} onChange={setSpoiler} label="Contains spoilers" />
          </View>
          {kind !== 'review' ? (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, padding: spacing.base, gap: spacing.sm }}>
              <Text variant="small" tone="muted">
                Community
              </Text>
              {(comms.data ?? []).length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.xs }}>
                  {(comms.data ?? []).map((c) => (
                    <Press key={c.id} onPress={() => setCommunityId(c.id)} style={{ height: 32, paddingHorizontal: 12, borderRadius: radius.full, justifyContent: 'center', backgroundColor: communityId === c.id ? colors.accent : colors.surface2 }}>
                      <Text variant="small" color={communityId === c.id ? colors.onAccent : colors.ink}>
                        {c.name}
                      </Text>
                    </Press>
                  ))}
                </ScrollView>
              ) : (
                <Text variant="caption" tone="muted">
                  Posts live inside communities. Join one first, or write a review.
                </Text>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
