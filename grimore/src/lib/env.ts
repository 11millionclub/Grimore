import { z } from 'zod';

/**
 * Public, client-safe configuration. Only EXPO_PUBLIC_* variables are inlined
 * into the bundle; never put the service-role key or any secret here.
 */
const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url().startsWith('https://'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY: z.string().optional(),
  EXPO_PUBLIC_APP_URL: z.url().optional(),
});

const parsed = schema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY || undefined,
  EXPO_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL || undefined,
});

export const envError = parsed.success
  ? null
  : 'GriMore is missing its Supabase configuration. Copy .env.example to .env, fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.';

export const env = parsed.success
  ? parsed.data
  : { EXPO_PUBLIC_SUPABASE_URL: 'https://invalid.local', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'missing-key-placeholder', EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY: undefined, EXPO_PUBLIC_APP_URL: undefined };
