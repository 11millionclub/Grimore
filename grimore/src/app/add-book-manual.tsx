import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Button, InlineAlert, Screen, Text, TextField } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { createManualBook } from '@/services/books';
import { cleanIsbn, isValidIsbn } from '@/services/books/normalize';
import { saveEntry } from '@/services/library';
import { spacing, useTheme } from '@/theme';
import { manualBookSchema, type ManualBookValues } from '@/validation/schemas';

export default function AddBookManual() {
  const userId = useMyId()!;
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState, setError: setFieldError } = useForm<ManualBookValues>({
    resolver: zodResolver(manualBookSchema),
    defaultValues: { title: '', authors: '', year: '', pages: '', isbn: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const isbn = v.isbn ? cleanIsbn(v.isbn) : undefined;
    if (isbn && !isValidIsbn(isbn)) {
      setFieldError('isbn', { message: 'That ISBN’s check digit does not add up' });
      return;
    }
    try {
      const id = await createManualBook({
        title: v.title,
        authors: v.authors.split(/[,;&]| and /).map((a) => a.trim()).filter(Boolean),
        year: v.year ? Number(v.year) : undefined,
        pageCount: v.pages ? Number(v.pages) : undefined,
        isbn,
      });
      await saveEntry(userId, id, { status: 'want_to_read' });
      void queryClient.invalidateQueries({ queryKey: qk.libraryAll });
      router.dismissAll();
      router.push({ pathname: '/book/[id]', params: { id } });
    } catch (e) {
      setError(toAppError(e).message);
    }
  });

  const field = (name: keyof ManualBookValues, label: string, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f, fieldState }) => <TextField label={label} value={f.value} onChangeText={f.onChange} onBlur={f.onBlur} error={fieldState.error?.message} {...extra} />}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar mode="close" title="Add by hand" />
      <Screen keyboard edgeTop={false}>
        <Text variant="callout" tone="muted" style={{ marginBottom: spacing.xl }}>
          If this book already exists in GriMore, we will link you to it instead of creating a duplicate.
        </Text>
        <View style={{ gap: spacing.lg }}>
          {error ? <InlineAlert>{error}</InlineAlert> : null}
          {field('title', 'Title')}
          {field('authors', 'Author(s)', { hint: 'Separate several authors with commas.' })}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>{field('year', 'First published', { keyboardType: 'number-pad', placeholder: '1967' })}</View>
            <View style={{ flex: 1 }}>{field('pages', 'Pages', { keyboardType: 'number-pad' })}</View>
          </View>
          {field('isbn', 'ISBN (optional)', { keyboardType: 'number-pad', autoCapitalize: 'characters' })}
          <Button title="Add to my library" size="lg" fullWidth loading={formState.isSubmitting} onPress={onSubmit} />
        </View>
      </Screen>
    </View>
  );
}
