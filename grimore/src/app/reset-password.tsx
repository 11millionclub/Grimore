import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import type { z } from 'zod';

import { Button, InlineAlert, Screen, Text, TextField } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { updatePassword } from '@/services/auth';
import { useSessionStore } from '@/stores/session';
import { spacing } from '@/theme';
import { newPasswordSchema } from '@/validation/schemas';

export default function ResetPassword() {
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await updatePassword(password);
      useSessionStore.getState().setRecovering(false);
    } catch (e) {
      setError(toAppError(e).message);
    }
  });

  return (
    <Screen keyboard>
      <View style={{ gap: spacing.sm, marginBottom: spacing.xxl, marginTop: spacing.xl }}>
        <Text variant="title1" accessibilityRole="header">
          Choose a new password
        </Text>
        <Text variant="body" tone="muted">
          Then we will take you straight back to your library.
        </Text>
      </View>
      <View style={{ gap: spacing.lg }}>
        {error ? <InlineAlert>{error}</InlineAlert> : null}
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField label="New password" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} secureTextEntry secureToggle autoComplete="new-password" />
          )}
        />
        <Controller
          control={control}
          name="confirm"
          render={({ field, fieldState }) => (
            <TextField label="Confirm password" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} secureTextEntry secureToggle autoComplete="new-password" />
          )}
        />
        <Button title="Save password" size="lg" fullWidth loading={formState.isSubmitting} onPress={onSubmit} />
      </View>
    </Screen>
  );
}
