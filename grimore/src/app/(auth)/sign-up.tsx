import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { CheckIcon, EnvelopeSimpleIcon } from '@/components/icons';
import { Btn, Card, Screen, Text, TextField } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { signUp } from '@/services/auth';
import { isUsernameAvailable } from '@/services/profile';
import { spacing, useTheme } from '@/theme';
import { signUpSchema, type SignUpValues } from '@/validation/schemas';

export default function SignUp() {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const { control, handleSubmit, formState, watch } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', username: '', email: '', password: '' },
  });
  const username = watch('username');

  useEffect(() => {
    if (!/^[A-Za-z0-9_.]{3,24}$/.test(username)) return;
    let live = true;
    const t = setTimeout(() => {
      isUsernameAvailable(username).then((ok) => live && setAvailable(ok), () => live && setAvailable(null));
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [username]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (available === false) return setError('That username is taken.');
    try {
      const { needsConfirmation } = await signUp(values);
      if (needsConfirmation) setSentTo(values.email);
    } catch (e) {
      setError(toAppError(e).message);
    }
  });

  if (sentTo)
    return (
      <Screen title="Check your email" back>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Card style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
            <EnvelopeSimpleIcon size={32} color={colors.accent} />
            <Text variant="title">Confirm your email</Text>
            <Text variant="callout" tone="muted" align="center">
              We sent a link to {sentTo}. Open it on this phone to finish creating your account.
            </Text>
            <Btn size="sm" variant="secondary" onPress={() => router.replace('/sign-in')} style={{ marginTop: spacing.sm, alignSelf: 'center' }}>
              Back to sign in
            </Btn>
          </Card>
        </View>
      </Screen>
    );

  const usernameOk = available === true && /^[A-Za-z0-9_.]{3,24}$/.test(username);

  return (
    <Screen title="What should we call you?" back keyboard>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.base }}>
        <Text variant="body" tone="muted" style={{ marginTop: -spacing.sm }}>
          This is what other readers will see.
        </Text>
        <Controller
          control={control}
          name="displayName"
          render={({ field, fieldState }) => (
            <TextField label="Name" placeholder="e.g. Carolina Reis" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} autoComplete="name" autoCapitalize="words" />
          )}
        />
        <Controller
          control={control}
          name="username"
          render={({ field, fieldState }) => (
            <TextField
              label="Username"
              prefix="@"
              placeholder="carol.reads"
              value={field.value}
              onChangeText={(v) => {
                setAvailable(null);
                field.onChange(v.toLowerCase().replace(/[^a-z0-9._]/g, ''));
              }}
              onBlur={field.onBlur}
              autoCapitalize="none"
              autoComplete="username"
              error={fieldState.error?.message ?? (available === false ? 'That username is taken' : undefined)}
              helper={usernameOk ? 'Available' : 'Letters, numbers, dots and underscores.'}
              right={usernameOk ? <CheckIcon size={18} weight="bold" color={colors.good} /> : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField label="Email" placeholder="name@example.com" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField label="Password" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} secureTextEntry autoComplete="new-password" helper="8+ characters with a letter and a number." />
          )}
        />
        {error ? (
          <Text variant="callout" tone="danger">
            {error}
          </Text>
        ) : null}
        <Btn size="lg" full loading={formState.isSubmitting} onPress={onSubmit} style={{ marginTop: spacing.sm }}>
          Create account
        </Btn>
        <Text variant="caption" tone="faint" align="center">
          By continuing you agree to read responsibly and be kind to other readers.
        </Text>
      </View>
    </Screen>
  );
}
