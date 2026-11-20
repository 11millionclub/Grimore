import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import { BarcodeIcon, MagnifyingGlassIcon, PlusIcon } from '@/components/icons';
import { Btn, Cover, Press, Sheet, Text, toast } from '@/components/ui';
import { resolveBookId, useAddToLibrary } from '@/hooks/use-add-book';
import { useDebounced } from '@/hooks/use-debounced';
import { toAppError } from '@/lib/errors';
import { searchExternal, type ExternalBook } from '@/services/books';
import { searchCatalogue } from '@/services/catalogue';
import { fonts, radius, spacing, useTheme } from '@/theme';

type Result = { key: string; id?: string; external?: ExternalBook; title: string; authors: string; year: number | null; cover: string | null };

export default function SearchSheet() {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 350);
  const add = useAddToLibrary();
  const local = useQuery({ queryKey: ['catalogue', term], queryFn: () => searchCatalogue(term, 12), enabled: term.length >= 2 });
  const remote = useQuery({ queryKey: ['external', term], queryFn: ({ signal }) => searchExternal(term, signal), enabled: term.length >= 3, staleTime: 5 * 60_000 });
  const seen = new Set((local.data ?? []).map((b) => b.title.toLowerCase()));
  const results: Result[] = [
    ...(local.data ?? []).map((b) => ({ key: b.id, id: b.id, title: b.title, authors: b.authors, year: b.first_published_year, cover: b.cover_url })),
    ...(remote.data ?? [])
      .filter((b) => !seen.has(b.title.toLowerCase()))
      .slice(0, 12)
      .map((b) => ({ key: `${b.source}:${b.sourceId}`, external: b, title: b.title, authors: b.authors.join(', '), year: b.firstPublishedYear ?? null, cover: b.coverUrl ?? null })),
  ];
  const loading = local.isFetching || remote.isFetching;
  const open = async (r: Result) => {
    try {
      const id = await resolveBookId(r);
      router.push({ pathname: '/book/[id]', params: { id } });
    } catch (e) {
      toast(toAppError(e).message);
    }
  };

  return (
    <Sheet>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <View style={{ height: 48, borderRadius: radius.full, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base }}>
          <MagnifyingGlassIcon size={20} color={colors.muted} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Title, author or ISBN"
            placeholderTextColor={colors.faint}
            selectionColor={colors.accent}
            returnKeyType="search"
            accessibilityLabel="Search books"
            style={{ flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 16 }}
          />
          {loading ? <ActivityIndicator color={colors.muted} /> : null}
        </View>
        <View style={{ marginTop: spacing.md, minHeight: 360 }}>
          {term.length >= 2 && !loading && results.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl }}>
              <BarcodeIcon size={36} color={colors.faint} />
              <Text variant="bodyStrong" style={{ marginTop: spacing.md }}>
                We could not find “{term}”
              </Text>
              <Text variant="small" tone="muted" align="center" style={{ marginTop: 4 }}>
                Scan the barcode and we will add the right edition.
              </Text>
              <Btn variant="secondary" size="sm" onPress={() => router.push({ pathname: '/scan', params: { mode: 'isbn' } })} style={{ marginTop: spacing.base, alignSelf: 'center' }}>
                Scan ISBN
              </Btn>
            </View>
          ) : (
            results.map((r) => (
              <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
                <Press onPress={() => open(r)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 }}>
                  <Cover uri={r.cover} title={r.title} author={r.authors} width={40} shadow={false} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="body" style={{ fontFamily: fonts.medium }} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text variant="small" tone="muted" numberOfLines={1}>
                      {[r.authors, r.year].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Press>
                <Press
                  accessibilityLabel={`Add ${r.title} to Want to read`}
                  onPress={() => add.mutate({ book: r })}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
                >
                  <PlusIcon size={18} weight="bold" color={colors.ink} />
                </Press>
              </View>
            ))
          )}
        </View>
      </View>
    </Sheet>
  );
}
