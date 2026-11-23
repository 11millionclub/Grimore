import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { DotsThreeIcon, FlagIcon } from '@/components/icons';
import { Press, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { report, type ReportReason } from '@/services/social';
import { radius, spacing, useTheme } from '@/theme';

export type ReportTarget =
  | { postId: string }
  | { reviewId: string }
  | { postCommentId: string }
  | { reviewCommentId: string }
  | { communityReplyId: string }
  | { communityThreadId: string };

const REASONS: { reason: ReportReason; label: string; hint: string }[] = [
  { reason: 'spoiler', label: 'Spoiler', hint: 'Gives away the plot without a warning' },
  { reason: 'hate', label: 'Offensive or hateful', hint: 'Insults, slurs or attacks on a group' },
  { reason: 'harassment', label: 'Harassment', hint: 'Targets or bullies someone' },
  { reason: 'spam', label: 'Spam', hint: 'Ads, scams or repeated posts' },
];

/** Things this reader reported in this session are hidden from them straight away. */
const useReported = create<{ ids: Set<string>; add: (id: string) => void }>((set) => ({
  ids: new Set(),
  add: (id) => set((s) => ({ ids: new Set(s.ids).add(id) })),
}));
const targetKey = (t: ReportTarget) => Object.values(t)[0] as string;
export const useIsReported = (t: ReportTarget) => useReported((s) => s.ids.has(targetKey(t)));

/** "⋯" on someone else's comment: report it as a spoiler, offensive, harassment or spam. */
export function ReportButton({ target, authorId, size = 18 }: { target: ReportTarget; authorId?: string | null; size?: number }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMyId();
  const add = useReported((s) => s.add);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!me || authorId === me) return null;
  const send = async (reason: ReportReason) => {
    setBusy(true);
    try {
      await report({ reporterId: me, reason, userId: authorId ?? undefined, ...target });
      add(targetKey(target));
      setOpen(false);
      toast(reason === 'spoiler' ? 'Thanks. We hid it for you and will review it.' : 'Thanks. We will take a look.');
    } catch (e) {
      toast(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Press accessibilityRole="button" accessibilityLabel="More options: report" onPress={() => setOpen(true)} hitSlop={10} style={{ padding: 4 }}>
        <DotsThreeIcon size={size} weight="bold" color={colors.faint} />
      </Press>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: colors.scrim }} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.sm, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
            <FlagIcon size={20} color={colors.danger} />
            <Text variant="h2">Report this</Text>
          </View>
          <Text variant="small" tone="muted">
            Reports are private. The author is not told who reported.
          </Text>
          {REASONS.map((r) => (
            <Press
              key={r.reason}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void send(r.reason)}
              style={{ minHeight: 56, justifyContent: 'center', borderRadius: radius.tile, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.base, paddingVertical: spacing.sm }}
            >
              <Text variant="bodyStrong">{r.label}</Text>
              <Text variant="caption" tone="muted">
                {r.hint}
              </Text>
            </Press>
          ))}
          <Press onPress={() => setOpen(false)} style={{ alignSelf: 'center', padding: spacing.md }}>
            <Text variant="small" tone="muted">
              Cancel
            </Text>
          </Press>
        </View>
      </Modal>
    </>
  );
}

/** Shows `children`, or a short note once this reader has reported it. */
export function ReportedGate({ target, children }: { target: ReportTarget; children: React.ReactNode }) {
  const hidden = useIsReported(target);
  if (!hidden) return <>{children}</>;
  return (
    <Text variant="small" tone="faint" style={{ fontStyle: 'italic', marginTop: 2 }}>
      You reported this. It is hidden for you while we review it.
    </Text>
  );
}
