import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import type { z } from 'zod';

import { TopBar } from '@/components/top-bar';
import { Button, InlineAlert, Screen, Text, TextField } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { sendPasswordReset } from '@/services/auth';
import { spacing } from '@/theme';
import { resetRequestSchema } from '@/validation/schemas';

export default function ForgotPassword() {
  const [status, setStatus] = useState<{ tone: 'olive' | 'danger'; text: string } | null>(null);
  const { control, handleSubmit, formState } = useForm<z.infer<typeof resetRequestSchema>>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setStatus(null);
    try {
      await sendPasswordReset(email);
      // Same message whether or not the account exists, to avoid account enumeration.
      setStatus({ tone: 'olive', text: 'If an account exists for that email, a reset link is on its way.' });
    } catch (e) {
      setStatus({ tone: 'danger', text: toAppError(e).message });
    }
  });

  return (
    <View style={{ flex: 1 }}>
      <TopBar />
      <Screen keyboard edgeTop={false}>
        <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }}>
          <Text variant="title1" accessibilityRole="header">
            Reset your password
          </Text>
          <Text variant="body" tone="muted">
            We will email you a link to choose a new one.
          </Text>
        </View>
        <View style={{ gap: spacing.lg }}>
          {status ? <InlineAlert tone={status.tone}>{status.text}</InlineAlert> : null}
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label="Email"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            )}
          />
          <Button title="Send reset link" size="lg" fullWidth loading={formState.isSubmitting} onPress={onSubmit} />
        </View>
      </Screen>
    </View>
  );
}
