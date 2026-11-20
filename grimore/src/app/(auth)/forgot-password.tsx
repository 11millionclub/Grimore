import { useState } from 'react';
import { View } from 'react-native';

import { Btn, Screen, Text, TextField } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { sendPasswordReset } from '@/services/auth';
import { spacing } from '@/theme';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Screen title="Reset password" back keyboard>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.base }}>
        <Text tone="muted">We will email you a link to choose a new one.</Text>
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        {msg ? <Text tone={msg.ok ? 'good' : 'danger'}>{msg.text}</Text> : null}
        <Btn
          size="lg"
          full
          loading={busy}
          disabled={!/\S+@\S+\.\S+/.test(email)}
          onPress={async () => {
            setBusy(true);
            try {
              await sendPasswordReset(email);
              // Same message whether or not the account exists (no account enumeration).
              setMsg({ ok: true, text: 'If an account exists for that email, a reset link is on its way.' });
            } catch (e) {
              setMsg({ ok: false, text: toAppError(e).message });
            } finally {
              setBusy(false);
            }
          }}
        >
          Send reset link
        </Btn>
      </View>
    </Screen>
  );
}
