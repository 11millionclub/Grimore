import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { pendingInvite } from '@/services/invites';
import { useTheme } from '@/theme';

/**
 * Opened from an invite link. The code is kept on this device and redeemed
 * as soon as the reader has an account (see InviteRedeemer in the root layout).
 */
export default function InviteLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const clean = (code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    void (clean.length >= 6 ? pendingInvite.set(clean) : Promise.resolve()).finally(() => setReady(true));
  }, [code]);
  if (ready) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator />
    </View>
  );
}
