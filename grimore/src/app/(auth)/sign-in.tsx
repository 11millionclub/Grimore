import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Button, InlineAlert, Screen, Text, TextField } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { signIn } from '@/services/auth';
import { spacing } from '@/theme';
import { signInSchema, type SignInValues } from '@/validation/schemas';

export default function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await signIn(values.email, values.password);
    } catch (e) {
      setError(toAppError(e).message);
    }
  });

  return (
    <View style={{ flex: 1 }}>
      <TopBar />
      <Screen keyboard edgeTop={false}>
        <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }}>
          <Text variant="title1" accessibilityRole="header">
            Welcome back
          </Text>
          <Text variant="body" tone="muted">
            Your shelves are where you left them.
          </Text>
        </View>
        <View style={{ gap: spacing.lg }}>
          {error ? <InlineAlert>{error}</InlineAlert> : null}
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
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                label="Password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                secureTextEntry
                secureToggle
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void onSubmit()}
              />
            )}
          />
          <Pressable accessibilityRole="link" onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-start' }} hitSlop={8}>
            <Text variant="callout" tone="accent">
              Forgot your password?
            </Text>
          </Pressable>
          <Button title="Sign in" size="lg" fullWidth loading={formState.isSubmitting} onPress={onSubmit} style={{ marginTop: spacing.sm }} />
          <Pressable accessibilityRole="link" onPress={() => router.replace('/sign-up')} style={{ alignSelf: 'center', padding: spacing.sm }}>
            <Text variant="callout" tone="muted">
              New to GriMore? <Text variant="callout" tone="accent">Create an account</Text>
            </Text>
          </Pressable>
        </View>
      </Screen>
    </View>
  );
}
