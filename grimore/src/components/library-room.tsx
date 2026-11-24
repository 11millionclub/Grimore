import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CaretLeftIcon, CaretRightIcon, LockSimpleIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@/components/icons';
import { Press, Text } from '@/components/ui';
import { fonts, radius, spacing, useTheme } from '@/theme';
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

export type ShelfBook = SagaBook & { cover_url?: string | null };
type Spine = { book: ShelfBook; x: number; w: number; h: number; bind: (typeof BINDINGS)[number]; saga: string };

/** Lay books along the boards (source pixels), a little gap between sagas. Returns one page per bookcase. */
function pack(books: ShelfBook[], scene: (typeof SCENES)[LibraryScene]) {
  const rows = scene.boards.length - 1;
  const width = scene.x1 - scene.x0 - 4;
  const pages: Spine[][][] = [];
  let page: Spine[][] = Array.from({ length: rows }, () => []);
  let row = 0;
  let x = 2;
  const push = () => {
    pages.push(page);
    page = Array.from({ length: rows }, () => []);
    row = 0;
    x = 2;
  };
  for (const saga of groupSagas(books)) {
    const bind = BINDINGS[hash(saga.key) % BINDINGS.length];
    saga.books.forEach((book, i) => {
      const w = Math.min(15, Math.max(9, 8 + (book.pages ?? 320) / 90));
      const gap = i === 0 && x > 2 ? 4 : 0.6;
      if (x + gap + w > width) {
        row += 1;
        x = 2;
        if (row >= rows) push();
      }
      const rowH = scene.boards[row + 1] - scene.boards[row] - 6;
      const h = rowH * (0.74 + (hash(book.id) % 20) / 100);
      page[row].push({ book, x: x + (x > 2 ? gap : 0), w, h, bind, saga: saga.name });
      x += (x > 2 ? gap : 0) + w;
    });
  }
  if (page.some((r) => r.length) || !pages.length) pages.push(page);
  return pages;
}

/**
 * Your books on the shelves of a painted library, grouped by saga. Tap a
 * spine to open the book. "Close-up" fills the screen with the bookcase so
 * titles are readable; "Room" shows the whole painting.
 */
export function LibraryRoom({ scene: sceneId, books, locked, empty }: { scene: LibraryScene; books: ShelfBook[]; locked?: boolean; empty?: string }) {
  const { colors } = useTheme();
  const scene = SCENES[sceneId];
  const [width, setWidth] = useState(0);
  const [close, setClose] = useState(true);
  const [pageIx, setPage] = useState(0);
  const pages = useMemo(() => pack(locked ? [] : books, scene), [books, scene, locked]);
  const page = pages[Math.min(pageIx, pages.length - 1)];

  // Close-up: the bay fills ~94% of the width; Room: the painting fits the width.
  const bay = scene.x1 - scene.x0;
  const scale = width ? (close ? (width * 0.94) / bay : width / scene.w) : 0;
  const top = close ? scene.boards[0] - 26 : 0;
  const bottom = close ? scene.boards[scene.boards.length - 1] + 22 : scene.h;
  const left = close ? scene.x0 - (width / scale - bay) / 2 : 0;
  const legible = 12 * scale >= 16;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ borderRadius: radius.card, overflow: 'hidden', backgroundColor: '#1a120c' }}>
      {width ? (
        <View style={{ width, height: (bottom - top) * scale, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: -left * scale, top: -top * scale, width: scene.w * scale, height: scene.h * scale }}>
            <Image source={scene.image} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityIgnoresInvertColors />
            {page.map((spines, r) =>
              spines.map((s) => {
                const floor = scene.boards[r + 1] - 1;
                const w = s.w * scale;
                const h = s.h * scale;
                return (
                  <Press
                    key={s.book.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${spineTitle(s.book.title)}${s.saga !== s.book.title ? `, ${s.saga}` : ''}`}
                    onPress={() => router.push({ pathname: '/book/[id]', params: { id: s.book.id } })}
                    style={{
                      position: 'absolute',
                      left: (scene.x0 + 2 + s.x) * scale,
                      top: floor * scale - h,
                      width: w,
                      height: h,
                      backgroundColor: s.bind.bg,
                      borderRadius: Math.max(1, scale),
                      borderWidth: 0.5,
                      borderColor: 'rgba(0,0,0,0.55)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Gilt bands at head and tail, and a soft highlight down the spine. */}
                    <View style={{ position: 'absolute', left: 0, right: 0, top: h * 0.07, height: Math.max(1, scale * 0.8), backgroundColor: s.bind.ink, opacity: 0.85 }} />
                    <View style={{ position: 'absolute', left: 0, right: 0, bottom: h * 0.07, height: Math.max(1, scale * 0.8), backgroundColor: s.bind.ink, opacity: 0.85 }} />
                    <View style={{ position: 'absolute', top: 0, bottom: 0, left: w * 0.18, width: w * 0.22, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                    {legible ? (
                      <View style={{ position: 'absolute', width: h * 0.76, height: w, left: (w - h * 0.76) / 2, top: (h - w) / 2, transform: [{ rotate: '-90deg' }], alignItems: 'center', justifyContent: 'center' }}>
                        <Text numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: Math.min(w * 0.55, 13), lineHeight: w * 0.9, color: s.bind.ink }}>
                          {spineTitle(s.book.title)}
                        </Text>
                      </View>
                    ) : null}
                  </Press>
                );
              }),
            )}
          </View>
          {locked ? (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10,6,3,0.45)', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <LockSimpleIcon size={30} weight="fill" color="#F2E3C0" />
              <Text variant="bodyStrong" color="#F2E3C0">
                {scene.name}
              </Text>
            </View>
          ) : !books.length && empty ? (
            <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, backgroundColor: 'rgba(10,6,3,0.7)', borderRadius: radius.tile, padding: spacing.md }}>
              <Text variant="small" color="#F2E3C0" align="center">
                {empty}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ aspectRatio: 1 }} />
      )}
      <View style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, flexDirection: 'row', gap: 6 }}>
        {pages.length > 1 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,6,3,0.6)', borderRadius: radius.full }}>
            <Press accessibilityLabel="Previous bookcase" disabled={pageIx === 0} onPress={() => setPage(pageIx - 1)} style={{ padding: 8, opacity: pageIx === 0 ? 0.4 : 1 }}>
              <CaretLeftIcon size={14} color="#F2E3C0" />
            </Press>
            <Text variant="caption" color="#F2E3C0">
              {pageIx + 1}/{pages.length}
            </Text>
            <Press accessibilityLabel="Next bookcase" disabled={pageIx >= pages.length - 1} onPress={() => setPage(pageIx + 1)} style={{ padding: 8, opacity: pageIx >= pages.length - 1 ? 0.4 : 1 }}>
              <CaretRightIcon size={14} color="#F2E3C0" />
            </Press>
          </View>
        ) : null}
        <Press
          accessibilityRole="button"
          accessibilityLabel={close ? 'Show the whole room' : 'Close-up of the shelves'}
          onPress={() => setClose(!close)}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(10,6,3,0.6)', alignItems: 'center', justifyContent: 'center' }}
        >
          {close ? <MagnifyingGlassMinusIcon size={16} color="#F2E3C0" /> : <MagnifyingGlassPlusIcon size={16} color="#F2E3C0" />}
        </Press>
      </View>
      <View style={{ position: 'absolute', left: spacing.sm, top: spacing.sm, backgroundColor: 'rgba(10,6,3,0.6)', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text variant="caption" color={colors.gold ?? '#E2C27A'} style={{ fontFamily: fonts.display, fontSize: 13 }}>
          {scene.name}
        </Text>
      </View>
    </View>
  );
}
