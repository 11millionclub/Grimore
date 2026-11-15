import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing, useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  /** Pad for the floating tab bar (tab root screens). */
  tabBarInset?: boolean;
  /** Apply the top safe-area inset (screens without a native header). */
  edgeTop?: boolean;
  padded?: boolean;
  keyboard?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
};

/**
 * Page container. Handles safe areas, max content width on tablets,
 * keyboard avoidance and pull-to-refresh so screens don't repeat it.
 */
export function Screen({
  children,
  scroll = true,
  tabBarInset,
  edgeTop = true,
  padded = true,
  keyboard,
  refreshing,
  onRefresh,
  background,
  contentStyle,
  scrollProps,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = (tabBarInset ? layout.tabBarHeight + spacing.xl : spacing.xxl) + insets.bottom;

  const inner: StyleProp<ViewStyle> = [
    {
      paddingTop: edgeTop ? insets.top + spacing.base : spacing.base,
      paddingHorizontal: padded ? layout.screenPadding : 0,
      paddingBottom: bottom,
      width: '100%',
      maxWidth: layout.maxContentWidth,
      alignSelf: 'center',
    },
    contentStyle,
  ];

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={inner}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.inkMuted} />
        ) : undefined
      }
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, inner]}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: background ?? colors.canvas }}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}
