import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { ArrowRightIcon, BarcodeIcon, CameraIcon, CaretRightIcon, FileArrowUpIcon, MagnifyingGlassIcon, PencilSimpleLineIcon, QuotesIcon, StorefrontIcon, type IconProps } from '@/components/icons';
import { LibraryScene } from '@/components/scene';
import { Press, Sheet, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

type Action = { label: string; hint: string; Icon: ComponentType<IconProps>; href: Parameters<typeof router.push>[0] };

const ACTIONS: Action[] = [
  { label: 'Search a book', hint: 'Title, author or ISBN, then pick the shelf', Icon: MagnifyingGlassIcon, href: '/search' },
  { label: 'Scan a barcode', hint: 'Point the camera at the ISBN', Icon: BarcodeIcon, href: { pathname: '/scan', params: { mode: 'isbn' } } },
  { label: 'Save a quote', hint: 'Photograph a page and pick the line', Icon: QuotesIcon, href: { pathname: '/scan', params: { mode: 'quote' } } },
  { label: 'Write a post', hint: 'Share a thought with your followers', Icon: PencilSimpleLineIcon, href: '/compose' },
  { label: 'Sell or trade', hint: 'List a copy on the Market', Icon: StorefrontIcon, href: '/sell' },
  { label: 'Import a library', hint: 'Kindle, Kobo, Goodreads, StoryGraph', Icon: FileArrowUpIcon, href: '/import' },
];

/** The wax-seal sheet: ways to add something. Page updates live on each book's page. */
export default function AddSheet() {
  const { colors } = useTheme();
  const go = (href: Action['href']) => {
    router.back();
    setTimeout(() => router.push(href), 60);
  };
  return (
    <Sheet title="Log">
      <View style={{ paddingHorizontal: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <Press
          accessibilityRole="button"
          accessibilityLabel="Photograph your shelf"
          onPress={() => go({ pathname: '/scan', params: { mode: 'shelf' } })}
          style={{ marginTop: spacing.base, height: 128, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.gold }}
        >
          <LibraryScene id="great-hall" style={{ position: 'absolute', inset: 0 }} />
          <LinearGradient colors={['transparent', 'rgba(20,12,6,0.45)', 'rgba(20,12,6,0.9)']} style={{ position: 'absolute', inset: 0 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <CameraIcon size={22} weight="fill" color="#f1e6d0" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="title" color="#f8f2e5" numberOfLines={1}>
                Photograph your shelf
              </Text>
              <Text variant="small" color="rgba(248,242,229,0.75)" numberOfLines={1}>
                Adds every spine it can read
              </Text>
            </View>
            <ArrowRightIcon size={18} weight="bold" color="#f8f2e5" />
          </View>
        </Press>

        <View style={{ marginTop: spacing.base, backgroundColor: colors.bg, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
          {ACTIONS.map(({ label, hint, Icon, href }, i) => (
            <Press
              key={label}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => go(href)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={19} color={colors.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {label}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {hint}
                </Text>
              </View>
              <CaretRightIcon size={16} color={colors.faint} />
            </Press>
          ))}
        </View>
        <Text variant="caption" tone="muted" align="center" style={{ marginTop: spacing.md }}>
          To log pages, open the book you are reading.
        </Text>
      </View>
    </Sheet>
  );
}
