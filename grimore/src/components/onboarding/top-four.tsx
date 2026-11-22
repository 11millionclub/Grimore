import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarcodeIcon, MagnifyingGlassIcon, XIcon } from '@/components/icons';
import { Btn, Cover, IconBtn, Press, Text, toast } from '@/components/ui';
import { useDebounced } from '@/hooks/use-debounced';
import { useTranslation } from '@/i18n';
import { searchExternal, type ExternalBook } from '@/services/books';
import { cleanIsbn } from '@/services/books/normalize';
import { getSuggestions, searchCatalogue } from '@/services/catalogue';
import { worldGenreBooks } from '@/services/discover';
import { fonts, radius, spacing, useTheme } from '@/theme';

import { Frame } from './frame';

/** A pick is either a catalogue book or an external hit that gets cached into `books` when saved. */
export type Pick = { key: string; id?: string; external?: ExternalBook; title: string; authors: string; cover: string | null };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

export function TopFour({ picks, setPicks, genreIds, genreSlugs, onNext }: { picks: Pick[]; setPicks: (p: Pick[]) => void; genreIds: number[]; genreSlugs: string[]; onNext: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [scanning, setScanning] = useState(false);
  const term = useDebounced(q.trim(), 350);
  const isIsbn = /^[0-9Xx-]{10,17}$/.test(term) && [10, 13].includes(cleanIsbn(term).length);

  const local = useQuery({ queryKey: ['catalogue', term], queryFn: () => searchCatalogue(term, 12), enabled: term.length >= 2 && !isIsbn });
  const remote = useQuery({ queryKey: ['external', term], queryFn: ({ signal }) => searchExternal(isIsbn ? cleanIsbn(term) : term, signal), enabled: term.length >= 3, staleTime: 5 * 60_000 });
  const popular = useQuery({
    queryKey: ['onboarding-popular', genreIds, genreSlugs[0]],
    queryFn: async () => {
      const [ours, world] = await Promise.all([getSuggestions(genreIds, [], 24), genreSlugs[0] ? worldGenreBooks(genreSlugs[0], 1).catch(() => ({ books: [] as ExternalBook[] })) : { books: [] as ExternalBook[] }]);
      return { ours, world: world.books };
    },
    staleTime: 30 * 60_000,
  });

  const chosen = new Set(picks.map((p) => p.key));
  const seen = new Set<string>();
  const dedupe = (p: Pick, isbn?: string) => {
    const k = isbn ? `isbn:${isbn}` : `t:${norm(p.title)}|${norm(p.authors.split(',')[0] ?? '')}`;
    if (seen.has(k) || seen.has(`t:${norm(p.title)}|${norm(p.authors.split(',')[0] ?? '')}`)) return false;
    seen.add(k);
    seen.add(`t:${norm(p.title)}|${norm(p.authors.split(',')[0] ?? '')}`);
    return true;
  };
  const fromCatalogue = (b: { id: string; title: string; authors: string; cover_url: string | null }): Pick => ({ key: b.id, id: b.id, title: b.title, authors: b.authors, cover: b.cover_url });
  const fromExternal = (b: ExternalBook): Pick => ({ key: `${b.source}:${b.sourceId}`, external: b, title: b.title, authors: b.authors.join(', '), cover: b.coverUrl ?? null });

  const searching = term.length >= 2;
  const groupA = searching ? (local.data ?? []).map(fromCatalogue).filter((p) => dedupe(p)) : (popular.data?.ours ?? []).map(fromCatalogue).filter((p) => dedupe(p));
  const groupB = searching
    ? (remote.data ?? []).map((b) => ({ p: fromExternal(b), isbn: b.isbn13 })).filter(({ p, isbn }) => dedupe(p, isbn)).map(({ p }) => p).slice(0, 24)
    : (popular.data?.world ?? []).map(fromExternal).filter((p) => dedupe(p));

  const toggle = (p: Pick) => {
    if (chosen.has(p.key)) setPicks(picks.filter((x) => x.key !== p.key));
    else if (picks.length < 4) setPicks([...picks, p]);
  };

  const onIsbn = async (code: string) => {
    setScanning(false);
    try {
      const hits = await searchExternal(cleanIsbn(code));
      if (!hits[0]) return toast(t('onboarding.top4.notFound'));
      const p = fromExternal(hits[0]);
      if (!chosen.has(p.key) && picks.length < 4) setPicks([...picks, p]);
    } catch {
      toast(t('onboarding.top4.notFound'));
    }
  };

  const grid = (items: Pick[]) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {items.map((b) => (
        <Press key={b.key} accessibilityLabel={t('onboarding.top4.pick', { title: b.title })} onPress={() => toggle(b)} style={{ width: '23%', flexGrow: 0 }}>
          <Cover uri={b.cover} title={b.title} author={b.authors} width={74} style={{ width: '100%', height: undefined, aspectRatio: 2 / 3 }} />
          <Text variant="micro" numberOfLines={2} style={{ marginTop: 4, fontFamily: fonts.regular }}>
            {b.title}
          </Text>
        </Press>
      ))}
    </View>
  );

  const cta = picks.length === 4 ? t('common.continue') : picks.length ? t('onboarding.top4.toGo', { n: 4 - picks.length }) : t('common.skip');
  return (
    <Frame title={t('onboarding.top4.title')} sub={t('onboarding.top4.sub')} cta={cta} disabled={picks.length > 0 && picks.length < 4} onNext={onNext}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
        {[0, 1, 2, 3].map((k) => (
          <View key={k} style={{ flex: 1, aspectRatio: 2 / 3, borderRadius: radius.cover + 2, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {picks[k] ? (
              <Press onPress={() => toggle(picks[k])} accessibilityLabel={t('onboarding.top4.remove', { title: picks[k].title })} style={{ width: '100%', height: '100%' }}>
                <Cover uri={picks[k].cover} title={picks[k].title} author={picks[k].authors} width={74} shadow={false} style={{ width: '100%', height: '100%' }} />
              </Press>
            ) : (
              <Text style={{ fontFamily: fonts.display, fontSize: 18 }} tone="faint">
                {k + 1}
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <View style={{ flex: 1, height: 48, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base }}>
          <MagnifyingGlassIcon size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('onboarding.top4.search')}
            placeholderTextColor={colors.faint}
            accessibilityLabel={t('onboarding.top4.search')}
            returnKeyType="search"
            style={{ flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 16 }}
          />
          {local.isFetching || remote.isFetching ? <ActivityIndicator color={colors.muted} /> : null}
        </View>
        <IconBtn label={t('onboarding.top4.scan')} size={48} filled onPress={() => setScanning(true)}>
          <BarcodeIcon size={22} color={colors.ink} />
        </IconBtn>
      </View>

      <Text variant="micro" tone="muted" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
        {(searching ? t('onboarding.top4.inGrimore') : t('onboarding.top4.popular')).toUpperCase()}
      </Text>
      {grid(groupA)}
      {groupB.length ? (
        <>
          <Text variant="micro" tone="muted" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
            {t('onboarding.top4.worldwide').toUpperCase()}
          </Text>
          {grid(groupB)}
        </>
      ) : null}
      {searching && !local.isFetching && !remote.isFetching && !groupA.length && !groupB.length ? (
        <Text variant="callout" tone="muted" style={{ marginTop: spacing.md }}>
          {t('onboarding.top4.empty')}
        </Text>
      ) : null}

      <IsbnScanner visible={scanning} onClose={() => setScanning(false)} onCode={onIsbn} />
    </Frame>
  );
}

function IsbnScanner({ visible, onClose, onCode }: { visible: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [permission, request] = useCameraPermissions();
  const done = useRef(false);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => {
      done.current = false;
    }}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
            onBarcodeScanned={({ data }) => {
              if (done.current || !/^\d{10,13}$/.test(data)) return;
              done.current = true;
              onCode(data);
            }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
            <Btn onPress={() => void request()}>{t('onboarding.top4.scan')}</Btn>
          </View>
        )}
        <View style={{ position: 'absolute', top: insets.top + 8, left: spacing.md, right: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconBtn label={t('common.close')} onPress={onClose} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <XIcon size={20} color="#fff" />
          </IconBtn>
          <Text variant="small" color="#fff" style={{ flex: 1 }}>
            {t('onboarding.top4.scanning')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
