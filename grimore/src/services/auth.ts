import * as Linking from 'expo-linking';

import { toAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/** Auth is email/password for v1. Social providers plug in here later (signInWithOAuth). */
export async function signUp(input: { email: string; password: string; username: string; displayName: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { username: input.username.toLowerCase(), display_name: input.displayName.trim() },
      emailRedirectTo: Linking.createURL('/'),
    },
  });
  if (error) throw toAppError(error);
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toAppError(error);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('/reset-password') });
  if (error) throw toAppError(error);
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toAppError(error);
}

/** Handles the recovery / confirmation link opened from email (deep link with tokens in the fragment). */
export async function consumeAuthLink(url: string) {
  const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw toAppError(error);
    return params.get('type');
  }
  return null;
}

/** Passwordless sign-in: emails a one-tap link that opens the app signed in. */
export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false, emailRedirectTo: Linking.createURL('/') },
  });
  if (error) throw toAppError(error);
}
