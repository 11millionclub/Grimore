import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Button, EmptyState, InlineAlert, Screen, Text, TextField } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { signUp } from '@/services/auth';
import { isUsernameAvailable } from '@/services/profile';
import { spacing } from '@/theme';
import { signUpSchema, type SignUpValues } from '@/validation/schemas';

export default function SignUp() {
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const { control, handleSubmit, formState, setError: setFieldError } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', username: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      if (!(await isUsernameAvailable(values.username))) {
        setFieldError('username', { message: 'That username is taken' });
        return;
      }
      const result = await signUp(values);
      if (result.needsConfirmation) setConfirmEmail(values.email);
    } catch (e) {
      setError(toAppError(e).message);
    }
  });

  if (confirmEmail) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar />
        <Screen edgeTop={false}>
          <EmptyState
            icon="mail"
            title="Check your inbox"
            body={`We sent a confirmation link to ${confirmEmail}. Open it on this device, then sign in.`}
            actionLabel="Go to sign in"
            onAction={() => router.replace('/sign-in')}
          />
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TopBar />
      <Screen keyboard edgeTop={false}>
        <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }}>
          <Text variant="title1" accessibilityRole="header">
            Begin your library
          </Text>
          <Text variant="body" tone="muted">
            It takes a minute. Your reading life will thank you.
          </Text>
        </View>
        <View style={{ gap: spacing.lg }}>
          {error ? <InlineAlert>{error}</InlineAlert> : null}
          <Controller
            control={control}
            name="displayName"
            render={({ field, fieldState }) => (
              <TextField label="Your name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} autoComplete="name" textContentType="name" />
            )}
          />
          <Controller
            control={control}
            name="username"
            render={({ field, fieldState }) => (
              <TextField
                label="Username"
                value={field.value}
                onChangeText={(t) => field.onChange(t.replace(/\s/g, '').toLowerCase())}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                hint="This is how other readers find you."
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                leadingIcon="at-sign"
              />
            )}
          />
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
                hint="8+ characters, with a letter and a number."
                secureTextEntry
                secureToggle
                autoComplete="new-password"
                textContentType="newPassword"
              />
            )}
          />
          <Button title="Create account" size="lg" fullWidth loading={formState.isSubmitting} onPress={onSubmit} style={{ marginTop: spacing.sm }} />
          <Text variant="caption" align="center">
            By continuing you agree to treat fellow readers with kindness.
          </Text>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/sign-in')} style={{ alignSelf: 'center', padding: spacing.sm }}>
            <Text variant="callout" tone="muted">
              Already a member? <Text variant="callout" tone="accent">Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </Screen>
    </View>
  );
}
