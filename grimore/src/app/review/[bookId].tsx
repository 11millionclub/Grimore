import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Toggle } from '@/components/switch';
import { PepperIcon, StarIcon, TrashIcon } from '@/components/icons';
import { Btn, Cover, Press, Screen, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { refreshLibrary } from '@/lib/query-client';
import { getBook } from '@/services/catalogue';
import { getEntry, saveEntry, statusPatch } from '@/services/library';
import { deleteItem, getMyReview, upsertReview } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { SPICE_LABELS, SPICE_STEPS, STAR_STEPS } from '@/utils/ratings';

export default function WriteReview() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const book = useQuery({ queryKey: ['book', bookId], queryFn: () => getBook(bookId) });
  const mine = useQuery({ queryKey: ['review', 'mine', bookId], queryFn: () => getMyReview(me, bookId) });
  const [stars, setStars] = useState(0);
  const [spice, setSpice] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  useEffect(() => {
    // Prefill once the existing review loads (editing).
    if (!mine.data) return;
    const t = setTimeout(() => {
      setStars(Number(mine.data!.rating));
      setSpice(mine.data!.spice ?? 0);
      setHeadline(mine.data!.headline ?? '');
      setBody(mine.data!.body ?? '');
      setSpoiler(mine.data!.has_spoilers);
    }, 0);
    return () => clearTimeout(t);
  }, [mine.data]);
  const save = useMutation({
    mutationFn: async () => {
      await upsertReview({ userId: me, bookId, rating: stars, spice, headline, body, hasSpoilers: spoiler });
      // The review's rating is the book's rating in your library, and a reviewed book counts as read.
      const entry = await getEntry(me, bookId);
      await saveEntry(me, bookId, { rating: stars, spice, ...(entry?.status === 'read' ? {} : statusPatch('read', entry)) });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['book', bookId] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void refreshLibrary(qc);
      router.back();
      toast(mine.data ? 'Review updated' : 'Review published');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const remove = useMutation({
    mutationFn: () => deleteItem('review', mine.data!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['book', bookId] });
      void qc.invalidateQueries({ queryKey: ['review', 'mine', bookId] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      router.back();
      toast('Review deleted');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  return (
    <Screen
      title={mine.data ? 'Edit review' : 'Your review'}
      large={false}
      back
      keyboard
      actions={
        <Btn size="sm" disabled={!stars} loading={save.isPending} onPress={() => save.mutate()}>
          {mine.data ? 'Save' : 'Publish'}
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
          {STAR_STEPS.map((i) => (
            <Press key={i} accessibilityLabel={`${i} stars`} onPress={() => setStars(i)} style={{ padding: 3 }}>
              <StarIcon size={32} weight="fill" color={i <= stars ? colors.gold : colors.surface3} />
            </Press>
          ))}
        </View>
        <View style={{ alignItems: 'center', marginTop: spacing.md, gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {SPICE_STEPS.map((i) => (
              <Press key={i} accessibilityLabel={`Spice ${i}`} onPress={() => setSpice(spice === i ? 0 : i)} style={{ padding: 3 }}>
                <PepperIcon size={24} weight={i <= spice ? 'fill' : 'regular'} color={i <= spice ? colors.danger : colors.surface3} />
              </Press>
            ))}
          </View>
          <Text variant="caption" tone="muted">
            {SPICE_LABELS[spice]}
          </Text>
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
        {mine.data ? (
          <Btn
            variant="ghost"
            full
            loading={remove.isPending}
            icon={<TrashIcon size={16} color={colors.danger} />}
            onPress={() => (confirmDelete ? remove.mutate() : setConfirmDelete(true))}
            style={{ marginTop: spacing.xl, borderColor: colors.danger }}
          >
            {confirmDelete ? 'Tap again to delete' : 'Delete review'}
          </Btn>
        ) : null}
      </View>
    </Screen>
  );
}
