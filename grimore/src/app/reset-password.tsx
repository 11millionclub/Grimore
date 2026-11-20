import { useState } from 'react';
import { View } from 'react-native';

import { Btn, Screen, Text, TextField } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { updatePassword } from '@/services/auth';
import { useSessionStore } from '@/stores/session';
import { spacing } from '@/theme';
import { newPasswordSchema } from '@/validation/schemas';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const parsed = newPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check your password');
    setBusy(true);
    try {
      await updatePassword(password);
      useSessionStore.getState().setRecovering(false);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title="New password" keyboard>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.base }}>
        <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <TextField label="Repeat it" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
        {error ? <Text tone="danger">{error}</Text> : null}
        <Btn size="lg" full loading={busy} onPress={save}>
          Save password
        </Btn>
      </View>
    </Screen>
  );
}
