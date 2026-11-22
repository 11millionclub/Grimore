import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookOpenIcon, BookmarkSimpleIcon, CheckCircleIcon, CheckIcon, HandPalmIcon, PauseCircleIcon, PlusIcon, StackIcon, XIcon, type IconProps } from '@/components/icons';
import { Flourish, Press, Text } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { listShelves, STATUS_META, type ReadingStatus } from '@/services/library';
import { fonts, radius, spacing, useTheme } from '@/theme';

export type ShelfChoice = { kind: 'status'; status: ReadingStatus } | { kind: 'shelf'; shelfId: string; title: string };

const STATUS_ICONS: Record<ReadingStatus, React.ComponentType<IconProps>> = {
  want_to_read: BookmarkSimpleIcon,
  reading: BookOpenIcon,
  read: CheckCircleIcon,
  on_hold: PauseCircleIcon,
  dnf: HandPalmIcon,
};
const ORDER: ReadingStatus[] = ['want_to_read', 'reading', 'read', 'on_hold', 'dnf'];

/**
 * "Which shelf?" bottom panel. Reading statuses first (a book has exactly
 * one), then the reader's own shelves (a book can be on many).
 */
export function ShelfPicker({
  visible,
  title,
  current,
  onPick,
  onClose,
  onRemove,
}: {
  visible: boolean;
  title?: string;
  current?: ReadingStatus | null;
  onPick: (c: ShelfChoice) => void;
  onClose: () => void;
  onRemove?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMyId();
  const shelves = useQuery({ queryKey: ['shelves', me], queryFn: () => listShelves(me!), enabled: !!me && visible });
  const choose = (c: ShelfChoice) => {
    onPick(c);
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: colors.scrim }} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          borderTopWidth: 1.5,
          borderColor: colors.gold,
          maxHeight: '80%',
          width: '100%',
          maxWidth: 560,
          alignSelf: 'center',
          paddingBottom: insets.bottom + spacing.base,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="h2" accessibilityRole="header">
              Add to shelf
            </Text>
            {title ? (
              <Text variant="small" tone="muted" numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </View>
          <Press accessibilityLabel="Close" onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <XIcon size={18} color={colors.ink} />
          </Press>
        </View>
        <Flourish style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          {ORDER.map((s) => {
            const Icon = STATUS_ICONS[s];
            const on = current === s;
            return (
              <Press
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => choose({ kind: 'status', status: s })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.line }}
              >
                <Icon size={22} weight={on ? 'fill' : 'regular'} color={on ? colors.accent : colors.ink} />
                <Text variant="body" style={{ flex: 1, fontFamily: on ? fonts.semibold : fonts.regular }} tone={on ? 'accent' : 'ink'}>
                  {STATUS_META[s].label}
                </Text>
                {on ? <CheckIcon size={18} weight="bold" color={colors.accent} /> : null}
              </Press>
            );
          })}
          <Text variant="micro" tone="muted" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
            YOUR SHELVES
          </Text>
          {(shelves.data ?? []).map((sh) => (
            <Press key={sh.id} accessibilityRole="button" onPress={() => choose({ kind: 'shelf', shelfId: sh.id, title: sh.title })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <StackIcon size={20} color={colors.ink} />
              <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {sh.title}
              </Text>
              <Text variant="caption" tone="faint">
                {sh.count}
              </Text>
            </Press>
          ))}
          <Press
            accessibilityRole="button"
            onPress={() => {
              onClose();
              router.push('/shelves/new');
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 }}
          >
            <PlusIcon size={20} color={colors.accent} />
            <Text variant="body" tone="accent">
              New shelf
            </Text>
          </Press>
          {onRemove && current ? (
            <Press
              accessibilityRole="button"
              onPress={() => {
                onRemove();
                onClose();
              }}
              style={{ alignSelf: 'center', padding: spacing.md, marginTop: spacing.sm }}
            >
              <Text variant="small" tone="danger">
                Remove from my library
              </Text>
            </Press>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
