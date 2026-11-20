import { View } from 'react-native';

import { ImportPanel } from '@/components/import-panel';
import { goBack, Screen, Text } from '@/components/ui';
import { spacing } from '@/theme';

export default function ImportScreen() {
  return (
    <Screen title="Import library" back>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
        <Text tone="muted">Bring your shelves, ratings and read dates from another app. Nothing is deleted: existing books are updated.</Text>
        <ImportPanel onDone={goBack} />
      </View>
    </Screen>
  );
}
