import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CaretLeftIcon, CaretRightIcon, LockSimpleIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@/components/icons';
import { Cartouche, CartoucheText } from '@/components/ornament';
import { Press, Text } from '@/components/ui';
import { fonts, GILT, radius, spacing } from '@/theme';
import { groupSagas, hash, spineTitle, type SagaBook } from '@/utils/sagas';

export type LibraryScene = 'classic' | 'hobbit' | 'palace' | 'academia';

/**
 * Each room is a painting with one empty bookcase. Geometry is in the
 * painting's own pixels (before the 2x export): the bay's left and right
 * edges and the top of each board, from the top shelf down.
 */
export const SCENES: Record<LibraryScene, { name: string; image: number; w: number; h: number; x0: number; x1: number; boards: number[]; light: boolean }> = {
  classic: { name: 'Classic Library', image: require('@/assets/images/libraries/classic.jpg'), w: 607, h: 540, x0: 308, x1: 514, boards: [110, 167, 221, 274, 328, 382, 441], light: false },
  hobbit: { name: 'Hillside Library', image: require('@/assets/images/libraries/hobbit.jpg'), w: 606, h: 540, x0: 190, x1: 468, boards: [158, 214, 271, 328, 384, 442], light: false },
  palace: { name: 'Palace Library', image: require('@/assets/images/libraries/palace.jpg'), w: 607, h: 555, x0: 240, x1: 514, boards: [113, 171, 228, 284, 341, 399, 457], light: true },
  academia: { name: 'Dark Academia Library', image: require('@/assets/images/libraries/academia.jpg'), w: 606, h: 555, x0: 218, x1: 496, boards: [102, 161, 218, 274, 332, 392, 456], light: false },
};
export const SCENE_IDS = Object.keys(SCENES) as LibraryScene[];

/** Cloth bindings in jewel tones; one per saga so a series reads as a set. */
const BINDINGS = [
  { bg: '#5E1A22', ink: '#E2C27A' },
  { bg: '#1E2748', ink: '#E2C27A' },
  { bg: '#1E3A2D', ink: '#E2C27A' },
  { bg: '#3B2346', ink: '#E2C27A' },
  { bg: '#17171B', ink: '#D9B866' },
  { bg: '#E8DDC6', ink: '#5A3A1A' },
  { bg: '#173C42', ink: '#E2C27A' },
  { bg: '#6E3A1E', ink: '#F0D9A0' },
  { bg: '#40122A', ink: '#E2C27A' },
];

export type ShelfBook = SagaBook & { cover_url?: string | null; featured?: boolean };
type Spine = { book: ShelfBook; x: number; w: number; h: number; bind: (typeof BINDINGS)[number]; saga: string };
type Row = { spines: Spine[]; face: { book: ShelfBook; w: number; h: number } | null };

/**
 * Lay books along the boards (source pixels), a little gap between sagas.
 * Books you are reading stand face-out at the end of the top shelves, like
 * a bookshop display. Returns one page per bookcase.
 */
function pack(books: ShelfBook[], scene: (typeof SCENES)[LibraryScene]) {
  const rows = scene.boards.length - 1;
  const width = scene.x1 - scene.x0 - 4;
  const rowH = (r: number) => scene.boards[r + 1] - scene.boards[r] - 6;
  const featured = books.filter((b) => b.featured && b.cover_url).slice(0, Math.min(3, rows));
  const faceIds = new Set(featured.map((b) => b.id));
  const blank = (withFaces: boolean): Row[] =>
    Array.from({ length: rows }, (_, r) => {
      const f = withFaces ? featured[r] : undefined;
      const h = rowH(r) * 0.9;
      return { spines: [], face: f ? { book: f, w: h * 0.66, h } : null };
    });
  const pages: Row[][] = [];
  let page = blank(true);
  let row = 0;
  let x = 2;
  const room = (r: number) => width - (page[r].face ? page[r].face!.w + 5 : 0);
  for (const saga of groupSagas(books.filter((b) => !faceIds.has(b.id)))) {
    const bind = BINDINGS[hash(saga.key) % BINDINGS.length];
    saga.books.forEach((book, i) => {
      const w = Math.min(19, Math.max(13, 11 + (book.pages ?? 320) / 80));
      const gap = i === 0 && x > 2 ? 4 : 0.6;
      if (x + gap + w > room(row)) {
        row += 1;
        x = 2;
        if (row >= rows) {
          pages.push(page);
          page = blank(false);
          row = 0;
        }
      }
      const h = rowH(row) * (0.74 + (hash(book.id) % 20) / 100);
      page[row].spines.push({ book, x: x + (x > 2 ? gap : 0), w, h, bind, saga: saga.name });
      x += (x > 2 ? gap : 0) + w;
    });
  }
  if (page.some((r) => r.spines.length || r.face) || !pages.length) pages.push(page);
  return pages;
}

/** One book on the shelf: the binding takes its colours from the real cover, with gilt bands and a rounded, lit spine. */
function SpineView({ s, scale, legible, left, top }: { s: Spine; scale: number; legible: boolean; left: number; top: number }) {
  const w = s.w * scale;
  const h = s.h * scale;
  const cover = s.book.cover_url;
  return (
    <Press
      accessibilityLabel={`${spineTitle(s.book.title)}${s.saga !== s.book.title ? `, ${s.saga}` : ''}`}
      onPress={() => router.push({ pathname: '/book/[id]', params: { id: s.book.id } })}
      style={{ position: 'absolute', left, top, width: w, height: h, backgroundColor: s.bind.bg, borderTopLeftRadius: Math.max(1, scale * 1.2), borderTopRightRadius: Math.max(1, scale * 1.2), overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 2 * scale, shadowOffset: { width: scale, height: 0 } }}
    >
      {cover ? (
        <>
          {/* The cover's left edge stretched along the spine gives each book its own colours and art. */}
          <Image source={{ uri: cover }} style={{ position: 'absolute', top: 0, left: -h * 0.04, width: h * 0.66, height: h }} contentFit="cover" recyclingKey={s.book.id} />
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(16,13,11,0.28)' }} />
        </>
      ) : null}
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.6)']} locations={[0, 0.3, 0.6, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: h * 0.06, height: Math.max(1, scale * 0.9), backgroundColor: GILT.gold }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: h * 0.06 + scale * 2, height: Math.max(0.5, scale * 0.45), backgroundColor: GILT.gold, opacity: 0.7 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: h * 0.06, height: Math.max(1, scale * 0.9), backgroundColor: GILT.gold }} />
      {legible ? (
        <View style={{ position: 'absolute', width: h * 0.78, height: w * 0.9, left: (w - h * 0.78) / 2, top: (h - w * 0.9) / 2, transform: [{ rotate: '-90deg' }], alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: cover ? 'rgba(16,13,11,0.62)' : 'transparent', paddingHorizontal: 3, borderRadius: 2, maxWidth: '100%' }}>
            <Text numberOfLines={w >= 30 ? 2 : 1} style={{ fontFamily: fonts.serifBold, fontSize: Math.min(w >= 30 ? w * 0.36 : w * 0.52, 13), lineHeight: Math.min(w >= 30 ? w * 0.4 : w * 0.8, 15), color: cover ? GILT.champagne : s.bind.ink, letterSpacing: 0.2, textAlign: 'center' }}>
              {spineTitle(s.book.title)}
            </Text>
          </View>
        </View>
      ) : null}
    </Press>
  );
}

/** A book standing face-out, turned slightly towards the room. */
function FaceOut({ book, w, h, left, top }: { book: ShelfBook; w: number; h: number; left: number; top: number }) {
  return (
    <Press
      accessibilityLabel={`${spineTitle(book.title)}, on display`}
      onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })}
      style={{ position: 'absolute', left, top, width: w, height: h, transform: [{ perspective: 600 }, { rotateY: '-14deg' }], shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 3, height: 2 } }}
    >
      <Image source={{ uri: book.cover_url ?? undefined }} style={{ width: '100%', height: '100%', borderRadius: 2, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.6)' }} contentFit="cover" />
      <LinearGradient colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.25)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0, borderRadius: 2 }} />
    </Press>
  );
}

/**
 * Your books on the shelves of a painted library, grouped by saga. Tap a
 * book to open it. "Close-up" fills the screen with the bookcase so titles
 * are readable; "Room" shows the whole painting.
 */
export function LibraryRoom({ scene: sceneId, books, locked, empty }: { scene: LibraryScene; books: ShelfBook[]; locked?: boolean; empty?: string }) {
  const scene = SCENES[sceneId];
  const [width, setWidth] = useState(0);
  const [close, setClose] = useState(true);
  const [pageIx, setPage] = useState(0);
  const pages = useMemo(() => pack(locked ? [] : books, scene), [books, scene, locked]);
  const page = pages[Math.min(pageIx, pages.length - 1)];

  // Close-up: the bay fills ~94% of the width; Room: the painting fits the width.
  const bay = scene.x1 - scene.x0;
  const scale = width ? (close ? (width * 0.97) / bay : width / scene.w) : 0;
  const top = close ? scene.boards[0] - 34 : 0;
  const bottom = close ? scene.boards[scene.boards.length - 1] + 22 : scene.h;
  const left = close ? scene.x0 - (width / scale - bay) / 2 : 0;
  const legible = 12 * scale >= 16;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: GILT.black, borderWidth: 1.5, borderColor: GILT.gold }}>
      {width ? (
        <View style={{ width, height: (bottom - top) * scale, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: -left * scale, top: -top * scale, width: scene.w * scale, height: scene.h * scale }}>
            <Image source={scene.image} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityIgnoresInvertColors />
            {page.map((r, ri) => {
              const floor = scene.boards[ri + 1] - 1;
              const rowTop = scene.boards[ri] + 4;
              return (
                <View key={ri} style={{ position: 'absolute', left: 0, top: 0 }}>
                  {/* Shadow the books cast on the back of the shelf. */}
                  {r.spines.length || r.face ? (
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.38)']}
                      style={{ position: 'absolute', left: (scene.x0 + 1) * scale, top: rowTop * scale, width: (bay - 2) * scale, height: (floor - rowTop) * scale }}
                    />
                  ) : null}
                  {r.spines.map((s) => (
                    <SpineView key={s.book.id} s={s} scale={scale} legible={legible} left={(scene.x0 + 2 + s.x) * scale} top={floor * scale - s.h * scale} />
                  ))}
                  {r.face ? <FaceOut book={r.face.book} w={r.face.w * scale} h={r.face.h * scale} left={(scene.x1 - 3 - r.face.w) * scale} top={floor * scale - r.face.h * scale} /> : null}
                </View>
              );
            })}
          </View>
          <LinearGradient pointerEvents="none" colors={['rgba(16,13,11,0.55)', 'rgba(16,13,11,0)', 'rgba(16,13,11,0)', 'rgba(16,13,11,0.45)']} locations={[0, 0.16, 0.85, 1]} style={{ position: 'absolute', inset: 0 }} />
          {locked ? (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10,6,3,0.45)', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <LockSimpleIcon size={30} weight="fill" color={GILT.champagne} />
              <Text style={{ fontFamily: fonts.serifBold, fontSize: 20, color: GILT.ivory }}>{scene.name}</Text>
            </View>
          ) : !books.length && empty ? (
            <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, backgroundColor: 'rgba(16,13,11,0.78)', borderRadius: radius.tile, borderWidth: 1, borderColor: 'rgba(198,154,67,0.5)', padding: spacing.md }}>
              <Text variant="small" color={GILT.ivory} align="center">
                {empty}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ aspectRatio: 1 }} />
      )}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' }}>
        <Cartouche size="sm">
          <CartoucheText size={14}>{scene.name}</CartoucheText>
        </Cartouche>
      </View>
      <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 6 }}>
        {pages.length > 1 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,13,11,0.72)', borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(198,154,67,0.5)' }}>
            <Press accessibilityLabel="Previous bookcase" disabled={pageIx === 0} onPress={() => setPage(pageIx - 1)} style={{ padding: 8 }}>
              <CaretLeftIcon size={14} color={GILT.champagne} />
            </Press>
            <Text variant="caption" color={GILT.champagne}>
              {pageIx + 1}/{pages.length}
            </Text>
            <Press accessibilityLabel="Next bookcase" disabled={pageIx >= pages.length - 1} onPress={() => setPage(pageIx + 1)} style={{ padding: 8 }}>
              <CaretRightIcon size={14} color={GILT.champagne} />
            </Press>
          </View>
        ) : null}
        <Press
          accessibilityLabel={close ? 'Show the whole room' : 'Close-up of the shelves'}
          onPress={() => setClose(!close)}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(16,13,11,0.72)', borderWidth: 1, borderColor: 'rgba(198,154,67,0.5)', alignItems: 'center', justifyContent: 'center' }}
        >
          {close ? <MagnifyingGlassMinusIcon size={16} color={GILT.champagne} /> : <MagnifyingGlassPlusIcon size={16} color={GILT.champagne} />}
        </Press>
      </View>
    </View>
  );
}
