import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaretLeftIcon } from '@/components/icons';
import { Btn, IconBtn, Press, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { fonts, radius, spacing, useTheme } from '@/theme';

/** Progress bar, Back and (optionally) Skip, pinned to the top of every onboarding screen. */
export function StepHeader({ step, total, onBack, onSkip }: { step: number; total: number; onBack?: () => void; onSkip?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={{ paddingTop: insets.top + 4, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <IconBtn label={t('common.back')} onPress={onBack} style={{ opacity: onBack ? 1 : 0 }}>
        <CaretLeftIcon size={22} weight="bold" color={colors.ink} />
      </IconBtn>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={t('onboarding.progress', { n: step, total })}
        accessibilityValue={{ min: 0, max: total, now: step }}
        style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface3, overflow: 'hidden' }}
      >
        <View style={{ width: `${Math.round((step / total) * 100)}%`, height: '100%', backgroundColor: colors.accent }} />
      </View>
      {onSkip ? (
        <Press onPress={onSkip} accessibilityRole="button" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="small" tone="muted">
            {t('common.skip')}
          </Text>
        </Press>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
}

/** One question per screen: a title, an optional line, the content and one big button. */
export function Frame({
  title,
  sub,
  children,
  cta,
  onNext,
  disabled,
  busy,
  ctaVariant = 'primary',
  footer,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
  cta?: string;
  onNext?: () => void;
  disabled?: boolean;
  busy?: boolean;
  ctaVariant?: 'primary' | 'secondary';
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom + spacing.md }}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 32 }}>
          {title}
        </Text>
        {sub ? (
          <Text variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
            {sub}
          </Text>
        ) : null}
        <View style={{ marginTop: spacing.xl }}>{children}</View>
      </ScrollView>
      {cta || footer ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
          {cta ? (
            <Btn size="lg" full variant={ctaVariant} disabled={disabled} loading={busy} onPress={onNext}>
              {cta}
            </Btn>
          ) : null}
          {footer}
        </View>
      ) : null}
    </View>
  );
}

/** Big multi-select chip. */
export function ChoiceChip({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Press
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 48,
        paddingHorizontal: spacing.base,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: on ? colors.accent : colors.lineStrong,
        backgroundColor: on ? colors.accent : colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {icon}
      <Text variant="callout" style={{ fontFamily: fonts.medium }} tone={on ? 'onAccent' : 'ink'}>
        {label}
      </Text>
    </Press>
  );
}

/** Full-width option row (single choice). */
export function OptionRow({ label, on, onPress, left }: { label: string; on: boolean; onPress: () => void; left?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Press
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
        minHeight: 64,
        borderRadius: radius.card,
        borderWidth: 1.5,
        borderColor: on ? colors.accent : colors.line,
        backgroundColor: on ? colors.accentSoft : colors.surface,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
      }}
    >
      {left}
      <Text variant="body" style={{ flex: 1, fontSize: 16, lineHeight: 22 }}>
        {label}
      </Text>
    </Press>
  );
}
