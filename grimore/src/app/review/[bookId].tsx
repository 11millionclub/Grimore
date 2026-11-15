import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Switch, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { BookCover, Button, InlineAlert, Rating, Screen, Text, TextField } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { getBook } from '@/services/catalogue';
import { saveEntry } from '@/services/library';
import { getMyReview, upsertReview } from '@/services/social';
import { spacing, useTheme } from '@/theme';
import { reviewSchema, type ReviewValues } from '@/validation/schemas';

export default function WriteReview() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const userId = useMyId()!;
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const book = useQuery({ queryKey: qk.book(bookId), queryFn: () => getBook(bookId) });
  const existing = useQuery({ queryKey: ['myReview', bookId], queryFn: () => getMyReview(userId, bookId) });

  const { control, handleSubmit, reset, formState } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, headline: '', body: '', hasSpoilers: false },
  });

  useEffect(() => {
    if (existing.data) {
      reset({ rating: Number(existing.data.rating), headline: existing.data.headline ?? '', body: existing.data.body ?? '', hasSpoilers: existing.data.has_spoilers });
    }
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const review = await upsertReview({ userId, bookId, rating: v.rating, headline: v.headline, body: v.body, hasSpoilers: v.hasSpoilers });
      // A review implies you have read it; keep the shelf rating in sync.
      await saveEntry(userId, bookId, { rating: v.rating });
      void queryClient.invalidateQueries({ queryKey: qk.bookReviews(bookId) });
      void queryClient.invalidateQueries({ queryKey: qk.libraryEntry(bookId) });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      router.back();
      router.push({ pathname: '/item/[type]/[id]', params: { type: 'review', id: review.id } });
    } catch (e) {
      setError(toAppError(e).message);
    }
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar mode="close" title={existing.data ? 'Edit review' : 'Write a review'} />
      <Screen keyboard edgeTop={false}>
        {book.data ? (
          <View style={{ flexDirection: 'row', gap: spacing.base, alignItems: 'center', marginBottom: spacing.xl }}>
            <BookCover title={book.data.title} uri={book.data.cover_url} size="sm" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title3">{book.data.title}</Text>
              <Text variant="caption">{book.data.authorsLine}</Text>
            </View>
          </View>
        ) : null}
        <View style={{ gap: spacing.xl }}>
          {error ? <InlineAlert>{error}</InlineAlert> : null}
          <Controller
            control={control}
            name="rating"
            render={({ field, fieldState }) => (
              <View style={{ gap: spacing.sm }}>
                <Text variant="eyebrow" tone={fieldState.error ? 'danger' : 'muted'}>
                  Your rating
                </Text>
                <Rating value={field.value} onChange={(r) => field.onChange(r ?? 0)} size={36} />
                {fieldState.error ? (
                  <Text variant="caption" tone="danger">
                    {fieldState.error.message}
                  </Text>
                ) : null}
              </View>
            )}
          />
          <Controller
            control={control}
            name="headline"
            render={({ field, fieldState }) => (
              <TextField label="Headline (optional)" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} placeholder="Your review in a line" maxLength={140} />
            )}
          />
          <Controller
            control={control}
            name="body"
            render={({ field, fieldState }) => (
              <TextField label="Review" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} placeholder="What stayed with you?" multiline style={{ minHeight: 200 }} />
            )}
          />
          <Controller
            control={control}
            name="hasSpoilers"
            render={({ field }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong">Contains spoilers</Text>
                  <Text variant="caption">Readers will see a warning and choose whether to reveal it.</Text>
                </View>
                <Switch value={field.value} onValueChange={field.onChange} trackColor={{ true: colors.accent, false: colors.borderStrong }} accessibilityLabel="Contains spoilers" />
              </View>
            )}
          />
          <Button title={existing.data ? 'Update review' : 'Publish review'} size="lg" fullWidth loading={formState.isSubmitting} onPress={onSubmit} />
        </View>
      </Screen>
    </View>
  );
}
