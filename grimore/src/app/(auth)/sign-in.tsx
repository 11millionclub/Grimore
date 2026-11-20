import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { EnvelopeSimpleIcon, LockSimpleIcon } from '@/components/icons';
import { Btn, Card, Press, Screen, Segmented, Text, TextField } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { sendMagicLink, signIn } from '@/services/auth';
import { spacing, useTheme } from '@/theme';

export default function SignIn() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<'link' | 'password'>('link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /\S+@\S+\.\S+/.test(email.trim());

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'link') {
        await sendMagicLink(email);
        setSent(true);
      } else await signIn(email, password);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Welcome back" back keyboard>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.base }}>
        <Text variant="body" tone="muted" style={{ marginTop: -spacing.sm }}>
          Sign in with the email you registered with.
        </Text>
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            setSent(false);
            setError(null);
          }}
          options={[
            { value: 'link', label: 'Email link' },
            { value: 'password', label: 'Password' },
          ]}
        />
        {sent ? (
          <Animated.View entering={FadeIn}>
            <Card style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
              <EnvelopeSimpleIcon size={32} color={colors.accent} />
              <Text variant="title">Check your email</Text>
              <Text variant="callout" tone="muted" align="center">
                We sent a sign-in link to {email.trim()}. Open it on this phone.
              </Text>
              <Btn size="sm" variant="secondary" onPress={() => setSent(false)} style={{ alignSelf: 'center', marginTop: spacing.sm }}>
                Use another email
              </Btn>
            </Card>
          </Animated.View>
        ) : (
          <>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              left={<EnvelopeSimpleIcon size={18} color={colors.muted} />}
            />
            {mode === 'password' ? (
              <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" left={<LockSimpleIcon size={18} color={colors.muted} />} />
            ) : null}
            {error ? (
              <Text variant="callout" tone="danger">
                {error}
              </Text>
            ) : null}
            <Btn size="lg" full loading={busy} disabled={!valid || (mode === 'password' && !password)} onPress={submit}>
              {mode === 'link' ? 'Send sign-in link' : 'Sign in'}
            </Btn>
            {mode === 'password' ? (
              <Press onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'center', padding: spacing.sm }}>
                <Text variant="small" tone="muted">
                  Forgot your password?
                </Text>
              </Press>
            ) : null}
          </>
        )}
        <Text variant="caption" tone="faint" align="center" style={{ marginTop: spacing.lg }}>
          No password needed: we can always send you a one-tap link.
        </Text>
      </View>
    </Screen>
  );
}
