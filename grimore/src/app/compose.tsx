import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toggle } from '@/components/switch';
import { BookOpenIcon, CaretRightIcon, EyeSlashIcon, FeatherIcon, QuotesIcon, StarIcon, type IconProps } from '@/components/icons';
import { Btn, Cover, Press, Segmented, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { myCommunities } from '@/services/communities';
import { listByStatus, logProgress } from '@/services/library';
import { createPost, upsertReview } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';

type Kind = 'review' | 'progress' | 'quote' | 'free';
const KINDS: { id: Kind; label: string; Icon: ComponentType<IconProps> }[] = [
  { id: 'review', label: 'Review', Icon: StarIcon },
  { id: 'progress', label: 'Progress', Icon: BookOpenIcon },
  { id: 'quote', label: 'Quote', Icon: QuotesIcon },
  { id: 'free', label: 'Free', Icon: FeatherIcon },
];

export default function Compose() {
  const params = useLocalSearchParams<{ kind?: Kind; bookId?: string; communityId?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMyId()!;
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>(params.kind ?? 'review');
  const [bookId, setBookId] = useState<string | null>(params.bookId ?? null);
  const [stars, setStars] = useState(4);
  const [text, setText] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [audience, setAudience] = useState<'public' | 'followers' | 'community'>(params.communityId ? 'community' : 'public');
  const [communityId, setCommunityId] = useState<string | null>(params.communityId ?? null);
  const [picking, setPicking] = useState(false);
  const books = useQuery({
    queryKey: ['compose-books', me],
    queryFn: async () => [...(await listByStatus(me, 'reading', 30)), ...(await listByStatus(me, 'read', 60))],
  });
  const comms = useQuery({ queryKey: ['my-communities', me], queryFn: () => myCommunities(me) });
  const book = (books.data ?? []).find((e) => e.book.id === bookId)?.book ?? books.data?.[0]?.book;
  const entry = (books.data ?? []).find((e) => e.book.id === book?.id);
  const ok = kind === 'progress' ? !!book : kind === 'review' ? !!book && stars > 0 : text.trim().length > 2 && (kind !== 'quote' || !!book);

  const publish = useMutation({
    mutationFn: async () => {
      const aud = audience === 'community' && !communityId ? 'public' : audience;
      if (kind === 'review') return upsertReview({ userId: me, bookId: book!.id, rating: stars, body: text, hasSpoilers: spoiler });
      if (kind === 'progress') return logProgress({ bookId: book!.id, page: entry?.current_page ?? 0, note: text, share: true, audience: aud === 'followers' ? 'followers' : 'public' });
      return createPost({ userId: me, kind: kind === 'quote' ? 'quote' : 'free', bookId: kind === 'quote' ? book!.id : null, quote: kind === 'quote' ? text : null, body: kind === 'free' ? text : null, hasSpoilers: spoiler, audience: aud, communityId });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
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
        <Text variant="bodyStrong">New post</Text>
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

        {kind !== 'free' ? (
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
        ) : null}
        {picking ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md }}>
            {(books.data ?? []).map((e) => (
              <Press
                key={e.id}
                onPress={() => {
                  setBookId(e.book.id);
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
            {[1, 2, 3, 4, 5].map((i) => (
              <Press key={i} accessibilityLabel={`${i} stars`} onPress={() => setStars(i)} style={{ padding: 4 }}>
                <StarIcon size={34} weight="fill" color={i <= stars ? colors.accent : colors.surface3} />
              </Press>
            ))}
          </View>
        ) : null}
        {kind === 'progress' && book ? (
          <Text variant="callout" tone="muted" align="center" style={{ marginTop: spacing.lg }}>
            You are on page{' '}
            <Text variant="callout" style={{ fontFamily: fonts.semibold }}>
              {entry?.current_page ?? 0}
            </Text>
            {book.page_count_estimate ? ` of ${book.page_count_estimate}` : ''}
          </Text>
        ) : null}

        <TextInput
          autoFocus
          value={text}
          onChangeText={(v) => setText(v.slice(0, 1000))}
          multiline
          placeholder={{ review: 'What did you think?', progress: 'How is it going?', quote: 'Type the line, or photograph the page from +', free: 'What are you thinking about?' }[kind]}
          placeholderTextColor={colors.faint}
          selectionColor={colors.accent}
          style={{ marginTop: spacing.lg, minHeight: kind === 'quote' ? 120 : 180, color: colors.ink, fontFamily: kind === 'quote' ? fonts.medium : fonts.regular, fontSize: kind === 'quote' ? 22 : 17, lineHeight: kind === 'quote' ? 29 : 25, textAlignVertical: 'top' }}
        />
        <Text variant="caption" tone="faint" align="right">
          {text.length}/1000
        </Text>

        <View style={{ marginTop: spacing.base, backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base }}>
            <EyeSlashIcon size={20} color={colors.muted} />
            <Text style={{ flex: 1 }}>Contains spoilers</Text>
            <Toggle value={spoiler} onChange={setSpoiler} label="Contains spoilers" />
          </View>
          {kind !== 'review' ? (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, padding: spacing.base, gap: spacing.sm }}>
              <Text variant="small" tone="muted">
                Who can see it
              </Text>
              <Segmented value={audience} onChange={setAudience} options={[{ value: 'public', label: 'Everyone' }, { value: 'followers', label: 'Followers' }, ...(kind !== 'progress' ? [{ value: 'community' as const, label: 'Community' }] : [])]} />
              {audience === 'community' ? (
                (comms.data ?? []).length ? (
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
                    Join a community first. Until then it is posted to everyone.
                  </Text>
                )
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
