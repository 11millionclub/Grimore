import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { BookSearch } from '@/components/book-search';
import { TopBar } from '@/components/top-bar';
import { BookCover, Button, Chip, ChipRow, Icon, InlineAlert, Screen, Text, TextField } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { getBook, type BookSummary } from '@/services/catalogue';
import { POST_KIND_META, createPost, type PostKind } from '@/services/social';
import { radius, spacing, useTheme } from '@/theme';
import { postSchema } from '@/validation/schemas';

const KINDS: PostKind[] = ['thought', 'question', 'recommendation', 'reading_update', 'discussion'];

export default function Compose() {
  const params = useLocalSearchParams<{ bookId?: string; kind?: PostKind }>();
  const userId = useMyId()!;
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<PostKind>(params.kind && KINDS.includes(params.kind) ? params.kind : 'thought');
  const [body, setBody] = useState('');
  const [book, setBook] = useState<BookSummary | null>(null);
  const [picking, setPicking] = useState(false);
  const [spoilers, setSpoilers] = useState(false);
  const [detached, setDetached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const initialBook = useQuery({ queryKey: qk.book(params.bookId ?? ''), queryFn: () => getBook(params.bookId!), enabled: !!params.bookId && !book });
  const attached: BookSummary | null =
    book ?? (!detached && initialBook.data ? { id: initialBook.data.id, title: initialBook.data.title, cover_url: initialBook.data.cover_url, first_published_year: initialBook.data.first_published_year, authors: initialBook.data.authorsLine } : null);

  const publish = async () => {
    setError(null);
    const parsed = postSchema.safeParse({ body });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check your post');
    if (kind === 'recommendation' && !attached) return setError('Attach the book you are recommending.');
    setBusy(true);
    try {
      await createPost({ userId, kind, body: parsed.data.body, bookId: attached?.id, hasSpoilers: spoilers });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      router.back();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar mode="close" title="New post" right={<Button title="Publish" size="sm" loading={busy} disabled={!body.trim()} onPress={() => void publish()} />} />
      <Screen keyboard edgeTop={false}>
        <View style={{ gap: spacing.lg }}>
          <ChipRow>
            {KINDS.map((k) => (
              <Chip key={k} label={POST_KIND_META[k].label} icon={POST_KIND_META[k].icon} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </ChipRow>
          {error ? <InlineAlert>{error}</InlineAlert> : null}
          <TextField value={body} onChangeText={setBody} placeholder={POST_KIND_META[kind].prompt} multiline autoFocus maxLength={4000} style={{ minHeight: 180, fontSize: 17 }} accessibilityLabel="Post text" />
          <Text variant="caption" align="right">
            {body.length}/4000
          </Text>

          {attached ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
              <BookCover title={attached.title} uri={attached.cover_url} size="xs" />
              <View style={{ flex: 1 }}>
                <Text variant="bookTitle">{attached.title}</Text>
                <Text variant="caption">{attached.authors}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Remove book" onPress={() => {
                  setBook(null);
                  setDetached(true);
                }} hitSlop={10}>
                <Icon name="x" size={18} tone="inkMuted" />
              </Pressable>
            </View>
          ) : picking ? (
            <BookSearch onSelect={(b) => { setBook(b); setPicking(false); }} />
          ) : (
            <Button title="Attach a book" icon="book" variant="secondary" onPress={() => setPicking(true)} style={{ alignSelf: 'flex-start' }} />
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Contains spoilers</Text>
              <Text variant="caption">Hidden behind a warning until a reader chooses to see it.</Text>
            </View>
            <Switch value={spoilers} onValueChange={setSpoilers} trackColor={{ true: colors.accent, false: colors.borderStrong }} accessibilityLabel="Contains spoilers" />
          </View>
          <Text variant="caption" tone="subtle">
            Be generous with other readers. Posts that harass or spoil without warning can be reported.
          </Text>
        </View>
      </Screen>
    </View>
  );
}
