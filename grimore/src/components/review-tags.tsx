import { View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';
import { MAX_REVIEW_TAGS, REVIEW_TAGS, tagLabel } from '@/utils/review-tags';

/** Tap phrases to pin them on your review (up to eight). */
export function ReviewTagPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (key: string) => onChange(value.includes(key) ? value.filter((k) => k !== key) : value.length >= MAX_REVIEW_TAGS ? value : [...value, key]);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="small" tone="muted">
        Tags · pick what fits
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {REVIEW_TAGS.map((t) => (
          <Chip key={t.key} active={value.includes(t.key)} onPress={() => toggle(t.key)}>
            {t.label}
          </Chip>
        ))}
      </View>
    </View>
  );
}

/** The tags pinned on a review, read-only. */
export function ReviewTags({ tags }: { tags?: string[] | null }) {
  const { colors } = useTheme();
  if (!tags?.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {tags.map((k) => (
        <View key={k} style={{ borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text variant="caption" tone="accent">
            {tagLabel(k)}
          </Text>
        </View>
      ))}
    </View>
  );
}
