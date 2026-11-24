import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, ImageIcon, LightningIcon, QuotesIcon, XIcon } from '@/components/icons';
import { Btn, Cover, IconBtn, Press, Segmented, Text, toast } from '@/components/ui';
import { useMyId, useShelf } from '@/hooks/queries';
import { ShelfPicker } from '@/components/shelf-picker';
import { resolveBookId, useAddToLibrary } from '@/hooks/use-add-book';
import { toAppError } from '@/lib/errors';
import { refreshLibrary } from '@/lib/query-client';
import { searchExternal, type ExternalBook } from '@/services/books';
import { addMany, saveQuote, type EntryPatch } from '@/services/library';
import { scanQuote, scanShelf } from '@/services/scan';
import { DarkTheme, fonts, palettes, radius, spacing } from '@/theme';

type Mode = 'shelf' | 'isbn' | 'quote';
const c = palettes.dark;

type Found = { key: string; title: string; author: string; confidence: number; id?: string; external?: ExternalBook; cover: string | null };

export default function ScanScreen() {
  return (
    <DarkTheme>
      <Scan />
    </DarkTheme>
  );
}

function Scan() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const insets = useSafeAreaInsets();
  const me = useMyId()!;
  const [mode, setMode] = useState<Mode>(params.mode ?? 'shelf');
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found[] | null>(null);
  const [sentences, setSentences] = useState<{ list: string[]; page: number | null } | null>(null);
  const [isbnHit, setIsbnHit] = useState<ExternalBook | null>(null);
  const [added, setAdded] = useState(0);
  const lastCode = useRef<string | null>(null);
  const add = useAddToLibrary();
  const [picking, setPicking] = useState(false);

  const analyse = async (base64: string) => {
    setBusy(true);
    try {
      if (mode === 'quote') {
        const r = await scanQuote(base64);
        if (!r.sentences.length) toast('No text found. Try a closer, brighter photo.');
        else setSentences({ list: r.sentences, page: r.page });
      } else {
        const r = await scanShelf(base64);
        if (!r.books.length) return toast('No spines recognised. Try one shelf at a time, straight on.');
        // Look up the ones the catalogue does not know yet.
        const list: Found[] = await Promise.all(
          r.books.map(async (b, i) => {
            if (b.match) return { key: `m${i}`, title: b.match.title, author: b.match.authors ?? b.author, confidence: b.confidence, id: b.match.id, cover: b.match.cover_url };
            try {
              const ext = (await searchExternal(`${b.title} ${b.author}`.trim()))[0];
              if (ext) return { key: `e${i}`, title: ext.title, author: ext.authors.join(', '), confidence: b.confidence, external: ext, cover: ext.coverUrl ?? null };
            } catch {
              /* fall through */
            }
            return { key: `u${i}`, title: b.title, author: b.author, confidence: Math.min(b.confidence, 0.5), cover: null };
          }),
        );
        setFound(list);
      }
    } catch (e) {
      toast(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const shoot = async () => {
    if (busy) return;
    if (mode === 'isbn') return toast('Point the camera at the barcode on the back cover.');
    try {
      const pic = await camera.current?.takePictureAsync({ base64: true, quality: 0.5, skipProcessing: false });
      if (pic?.base64) await analyse(pic.base64);
    } catch (e) {
      toast(toAppError(e).message);
    }
  };

  const fromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
    if (!res.canceled && res.assets[0]?.base64) await analyse(res.assets[0].base64);
  };

  const onBarcode = async ({ data }: { data: string }) => {
    const code = data.replace(/[^0-9X]/g, '');
    if (mode !== 'isbn' || busy || isbnHit || code === lastCode.current || !/^(97[89])?\d{9}[\dX]$/.test(code)) return;
    lastCode.current = code;
    setBusy(true);
    try {
      const hit = (await searchExternal(code))[0];
      if (hit) setIsbnHit(hit);
      else toast('We do not know that ISBN yet. Try searching by title.');
    } catch (e) {
      toast(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const granted = permission?.granted;
  const label = { shelf: 'Shelf', isbn: 'One by one', quote: 'Quote' }[mode];

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconBtn label="Close" onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <XIcon size={20} weight="bold" color="#fff" />
        </IconBtn>
        <Text variant="bodyStrong" color="#fff">
          {label}
        </Text>
        <IconBtn label={torch ? 'Torch off' : 'Torch on'} onPress={() => setTorch(!torch)} style={{ backgroundColor: torch ? '#fff' : 'rgba(255,255,255,0.12)' }}>
          <LightningIcon size={20} weight="fill" color={torch ? '#000' : '#fff'} />
        </IconBtn>
      </View>

      <View style={{ marginHorizontal: spacing.md, marginTop: spacing.md, aspectRatio: 1 / 1.42, borderRadius: 28, overflow: 'hidden', backgroundColor: '#171717' }}>
        {granted ? (
          <CameraView
            ref={camera}
            style={{ flex: 1 }}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={mode === 'isbn' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a'] } : undefined}
            onBarcodeScanned={mode === 'isbn' ? onBarcode : undefined}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
            <Text variant="title" color="#fff" align="center">
              Grimore needs the camera
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.7)" align="center">
              To read spines, barcodes and pages. Photos are only used for the scan.
            </Text>
            <Btn onPress={requestPermission} style={{ alignSelf: 'center' }}>
              Allow camera
            </Btn>
          </View>
        )}
        {mode === 'isbn' && granted ? (
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <View style={{ width: 256, height: 128, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' }} />
            <Text variant="small" color="rgba(255,255,255,0.85)" style={{ position: 'absolute', bottom: 24 }}>
              Point at the barcode on the back cover
            </Text>
          </View>
        ) : null}
        {mode !== 'isbn' ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : null}
              <Text variant="small" color="#fff">
                {busy ? (mode === 'quote' ? 'Reading the page…' : 'Recognising spines…') : mode === 'quote' ? 'Frame the page, flat and well lit' : 'Frame a whole shelf'}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: 'auto', paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + 14 }}>
        <View style={{ alignSelf: 'center', width: 290 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.full }}>
            <Segmented
              value={mode}
              onChange={(m) => {
                setMode(m);
                setFound(null);
                setSentences(null);
                setIsbnHit(null);
                lastCode.current = null;
              }}
              options={[
                { value: 'shelf', label: 'Shelf' },
                { value: 'isbn', label: 'One by one' },
                { value: 'quote', label: 'Quote' },
              ]}
            />
          </View>
        </View>
        <View style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 56 }}>
            {added ? (
              <Text variant="caption" color="rgba(255,255,255,0.6)">
                {added} added
              </Text>
            ) : mode !== 'isbn' ? (
              <IconBtn label="Choose from photos" onPress={fromLibrary} style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                <ImageIcon size={20} color="#fff" />
              </IconBtn>
            ) : null}
          </View>
          <Press onPress={shoot} disabled={busy || !granted} accessibilityLabel="Capture" style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: mode === 'isbn' ? 'rgba(255,255,255,0.35)' : '#fff' }} />
          </Press>
          <View style={{ width: 56 }} />
        </View>
      </View>

      {isbnHit ? (
        <Animated.View entering={FadeInDown.springify().damping(16)} style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: insets.bottom + 140, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 22, backgroundColor: 'rgba(23,23,23,0.95)', padding: spacing.md }}>
          <Cover uri={isbnHit.coverUrl} title={isbnHit.title} width={48} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyStrong" color="#fff" numberOfLines={1}>
              {isbnHit.title}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.6)" numberOfLines={1}>
              {isbnHit.authors.join(', ')}
            </Text>
          </View>
          <Btn
            size="sm"
            loading={add.isPending}
            onPress={() => setPicking(true)}
          >
            Add
          </Btn>
        </Animated.View>
      ) : null}
      <ShelfPicker
        visible={picking && !!isbnHit}
        title={isbnHit?.title}
        onClose={() => setPicking(false)}
        onPick={(choice) =>
          isbnHit &&
          add.mutate(
            { book: { external: isbnHit, title: isbnHit.title }, choice, owned: true },
            {
              onSuccess: () => {
                setAdded((a) => a + 1);
                setIsbnHit(null);
                lastCode.current = null;
              },
            },
          )
        }
      />

      {found ? <ShelfReview me={me} found={found} onRetake={() => setFound(null)} /> : null}
      {sentences ? <QuoteReview me={me} sentences={sentences} onRetake={() => setSentences(null)} /> : null}
    </View>
  );
}

function SheetPanel({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View entering={SlideInDown.springify().damping(20)} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '74%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: c.surface, paddingBottom: insets.bottom + 10 }}>
      {children}
    </Animated.View>
  );
}

function ShelfReview({ me, found, onRetake }: { me: string; found: Found[]; onRetake: () => void }) {
  const qc = useQueryClient();
  const usable = found.filter((f) => f.id || f.external);
  const [sel, setSel] = useState<Set<string>>(() => new Set(usable.filter((f) => f.confidence >= 0.6).map((f) => f.key)));
  const [shelf, setShelf] = useState<'own' | 'read' | 'want'>('own');
  const shelfName = { own: 'My shelf', read: 'Finished', want: 'TBR' }[shelf];
  const save = useMutation({
    mutationFn: async () => {
      const ids: string[] = [];
      for (const f of usable.filter((x) => sel.has(x.key))) ids.push(await resolveBookId(f));
      const patch: EntryPatch = shelf === 'read' ? { status: 'read', is_owned: true } : shelf === 'want' ? { status: 'want_to_read' } : { is_owned: true };
      return addMany(me, ids, patch, shelf !== 'own');
    },
    onSuccess: (n) => {
      void refreshLibrary(qc);
      router.back();
      toast(`${n} books added to ${shelfName}`);
    },
    onError: (e) => toast(toAppError(e).message),
  });
  return (
    <SheetPanel>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text variant="h1" color={c.ink}>
            {found.length} books
          </Text>
          <Press onPress={onRetake}>
            <Text variant="callout" color={c.muted}>
              Retake
            </Text>
          </Press>
        </View>
        <Text variant="small" color={c.muted} style={{ marginTop: 4 }}>
          Uncertain matches start unticked. Check them before adding.
        </Text>
        <View style={{ marginTop: spacing.base }}>
          <Segmented value={shelf} onChange={setShelf} options={[{ value: 'own', label: 'I own' }, { value: 'read', label: 'Finished' }, { value: 'want', label: 'TBR' }]} />
        </View>
      </View>
      <ScrollView style={{ marginTop: spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
        {found.map((f) => {
          const on = sel.has(f.key);
          const ok = !!(f.id || f.external);
          return (
            <Press
              key={f.key}
              disabled={!ok}
              onPress={() =>
                setSel((s) => {
                  const n = new Set(s);
                  if (n.has(f.key)) n.delete(f.key);
                  else n.add(f.key);
                  return n;
                })
              }
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }}
            >
              <Cover uri={f.cover} title={f.title} author={f.author} width={36} shadow={false} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" color={c.ink} style={{ fontFamily: fonts.medium }} numberOfLines={1}>
                  {f.title}
                </Text>
                <Text variant="caption" color={c.muted} numberOfLines={1}>
                  {f.author}
                  {!ok ? <Text variant="caption" color={c.accent}>{' · not found, search for it'}</Text> : f.confidence < 0.8 ? <Text variant="caption" color={c.accent}>{' · check the edition'}</Text> : null}
                </Text>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? c.accent : c.lineStrong, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <CheckIcon size={13} weight="bold" color={c.onAccent} /> : null}
              </View>
            </Press>
          );
        })}
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Btn size="lg" full disabled={sel.size === 0} loading={save.isPending} onPress={() => save.mutate()}>
          {`Add ${sel.size} to ${shelfName}`}
        </Btn>
      </View>
    </SheetPanel>
  );
}

function QuoteReview({ me, sentences, onRetake }: { me: string; sentences: { list: string[]; page: number | null }; onRetake: () => void }) {
  const reading = useShelf(me, 'reading');
  const [pick, setPick] = useState<Set<number>>(new Set());
  const [bookId, setBookId] = useState<string | null>(null);
  const book = bookId ?? reading.data?.[0]?.book.id ?? null;
  const text = sentences.list.filter((_, i) => pick.has(i)).join(' ');
  const save = useMutation({
    mutationFn: async () => {
      await saveQuote(me, { body: text, bookId: book });
    },
    onSuccess: () => {
      router.back();
      const title = reading.data?.find((r) => r.book.id === book)?.book.title;
      toast(`Quote saved${title ? ` in ${title}` : ''}${sentences.page ? `, p. ${sentences.page}` : ''}`);
    },
    onError: (e) => toast(toAppError(e).message),
  });
  return (
    <SheetPanel>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text variant="h1" color={c.ink}>
          Pick the lines
        </Text>
        <Press onPress={onRetake}>
          <Text variant="callout" color={c.muted}>
            Retake
          </Text>
        </Press>
      </View>
      <ScrollView style={{ marginTop: spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 6 }}>
        {sentences.list.map((s, i) => {
          const on = pick.has(i);
          return (
            <Press
              key={i}
              onPress={() =>
                setPick((p) => {
                  const n = new Set(p);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                })
              }
              style={{ borderRadius: radius.tile, padding: spacing.md, backgroundColor: on ? 'rgba(255,106,61,0.25)' : c.surface2 }}
            >
              <Text variant="body" color={c.ink}>
                {s}
              </Text>
            </Press>
          );
        })}
      </ScrollView>
      {(reading.data ?? []).length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {(reading.data ?? []).map((r) => (
            <Press key={r.id} onPress={() => setBookId(r.book.id)} style={{ opacity: book === r.book.id ? 1 : 0.5 }}>
              <Cover uri={r.book.cover_url} title={r.book.title} width={40} />
            </Press>
          ))}
        </ScrollView>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: c.line, paddingHorizontal: spacing.lg, paddingTop: spacing.md, marginTop: spacing.md }}>
        <Btn size="lg" style={{ flex: 1 }} disabled={!text} loading={save.isPending} onPress={() => save.mutate()} icon={<QuotesIcon size={18} weight="fill" color={c.onAccent} />}>
          Save quote
        </Btn>
      </View>
    </SheetPanel>
  );
}
