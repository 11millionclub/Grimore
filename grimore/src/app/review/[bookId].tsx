import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Toggle } from '@/components/switch';
import { StarIcon } from '@/components/icons';
import { Btn, Cover, Press, Screen, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { getBook } from '@/services/catalogue';
import { saveEntry } from '@/services/library';
import { getMyReview, upsertReview } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function WriteReview() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const book = useQuery({ queryKey: ['book', bookId], queryFn: () => getBook(bookId) });
  const mine = useQuery({ queryKey: ['review', 'mine', bookId], queryFn: () => getMyReview(me, bookId) });
  const [stars, setStars] = useState(0);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  useEffect(() => {
    // Prefill once the existing review loads (editing).
    if (!mine.data) return;
    const t = setTimeout(() => {
      setStars(Number(mine.data!.rating));
      setHeadline(mine.data!.headline ?? '');
      setBody(mine.data!.body ?? '');
      setSpoiler(mine.data!.has_spoilers);
    }, 0);
    return () => clearTimeout(t);
  }, [mine.data]);
  const save = useMutation({
    mutationFn: async () => {
      await upsertReview({ userId: me, bookId, rating: stars, headline, body, hasSpoilers: spoiler });
      await saveEntry(me, bookId, { rating: stars });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['book', bookId] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['library'] });
      router.back();
      toast('Review published');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  return (
    <Screen
      title="Your review"
      large={false}
      back
      keyboard
      actions={
        <Btn size="sm" disabled={!stars} loading={save.isPending} onPress={() => save.mutate()}>
          Publish
        </Btn>
      }
    >
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
          <Cover uri={book.data?.cover_url} title={book.data?.title ?? ''} width={40} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {book.data?.title}
            </Text>
            <Text variant="small" tone="muted" numberOfLines={1}>
              {book.data?.authorsLine}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: spacing.xl }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Press key={i} accessibilityLabel={`${i} stars`} onPress={() => setStars(i)} style={{ padding: 4 }}>
              <StarIcon size={34} weight="fill" color={i <= stars ? colors.accent : colors.surface3} />
            </Press>
          ))}
        </View>
        <TextInput
          value={headline}
          onChangeText={setHeadline}
          maxLength={140}
          placeholder="Headline (optional)"
          placeholderTextColor={colors.faint}
          selectionColor={colors.accent}
          style={{ marginTop: spacing.xl, color: colors.ink, fontFamily: fonts.semibold, fontSize: 20 }}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          maxLength={20000}
          multiline
          placeholder="What did you think?"
          placeholderTextColor={colors.faint}
          selectionColor={colors.accent}
          style={{ marginTop: spacing.md, minHeight: 180, color: colors.ink, fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, textAlignVertical: 'top' }}
        />
        <View style={{ marginTop: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, paddingHorizontal: spacing.base, height: 56 }}>
          <Text style={{ flex: 1 }}>Contains spoilers</Text>
          <Toggle value={spoiler} onChange={setSpoiler} label="Contains spoilers" />
        </View>
      </View>
    </Screen>
  );
}
