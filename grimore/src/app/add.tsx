import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { ArrowRightIcon, BarcodeIcon, BookOpenTextIcon, CameraIcon, FileArrowUpIcon, MagnifyingGlassIcon, PencilSimpleLineIcon, QuotesIcon, StorefrontIcon, type IconProps } from '@/components/icons';
import { LibraryScene } from '@/components/scene';
import { Press, Sheet, Text } from '@/components/ui';
import { useMyId, useShelf } from '@/hooks/queries';
import { fonts, radius, spacing, useTheme } from '@/theme';

export default function AddSheet() {
  const { colors } = useTheme();
  const me = useMyId();
  const reading = useShelf(me, 'reading');
  const current = reading.data?.[0];
  const go = (href: Parameters<typeof router.push>[0]) => {
    router.back();
    setTimeout(() => router.push(href), 60);
  };
  const small: { label: string; Icon: ComponentType<IconProps>; on: () => void }[] = [
    { label: 'Scan ISBN', Icon: BarcodeIcon, on: () => go({ pathname: '/scan', params: { mode: 'isbn' } }) },
    { label: 'Search', Icon: MagnifyingGlassIcon, on: () => go('/search') },
    { label: 'Update page', Icon: BookOpenTextIcon, on: () => (current ? go({ pathname: '/progress/[bookId]', params: { bookId: current.book.id } }) : go('/search')) },
    { label: 'Save a quote', Icon: QuotesIcon, on: () => go({ pathname: '/scan', params: { mode: 'quote' } }) },
    { label: 'Post', Icon: PencilSimpleLineIcon, on: () => go('/compose') },
    { label: 'Sell or trade', Icon: StorefrontIcon, on: () => go('/sell') },
  ];
  return (
    <Sheet title="Log">
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Press onPress={() => go({ pathname: '/scan', params: { mode: 'shelf' } })} style={{ marginTop: spacing.base, height: 168, borderRadius: radius.card, overflow: 'hidden' }}>
          <LibraryScene id="great-hall" style={{ position: 'absolute', inset: 0 }} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', inset: 0 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.base, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <CameraIcon size={20} weight="fill" color="#fff" />
                <Text variant="title" color="#fff">
                  Photograph your shelf
                </Text>
              </View>
              <Text variant="small" color="rgba(255,255,255,0.75)" style={{ marginTop: 2 }}>
                Recognises dozens of spines at once
              </Text>
            </View>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightIcon size={18} weight="bold" color="#000" />
            </View>
          </View>
        </Press>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          {small.map(({ label, Icon, on }) => (
            <Press key={label} onPress={on} style={{ width: '31.8%', aspectRatio: 1 / 0.86, borderRadius: radius.tile, backgroundColor: colors.surface2, padding: spacing.md, justifyContent: 'space-between' }}>
              <Icon size={22} color={colors.ink} />
              <Text variant="small" style={{ fontFamily: fonts.medium }}>
                {label}
              </Text>
            </Press>
          ))}
        </View>
        <Press onPress={() => go('/import')} style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
          <FileArrowUpIcon size={18} color={colors.muted} />
          <Text variant="small" tone="muted">
            Import from Goodreads or StoryGraph
          </Text>
        </Press>
      </View>
    </Sheet>
  );
}
