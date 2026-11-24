import { supabase } from '@/lib/supabase';

export type Maintenance = { on: boolean; message: string | null };

/**
 * The team's kill switch (public.app_config, written only with the service
 * role). If the table is missing or unreachable the app keeps working.
 */
export async function getMaintenance(): Promise<Maintenance> {
  const { data, error } = await supabase.from('app_config').select('value').eq('key', 'maintenance').maybeSingle();
  if (error || !data) return { on: false, message: null };
  const v = data.value as { on?: boolean; message?: string } | null;
  return { on: !!v?.on, message: v?.message ?? null };
}

/**
 * Whether paid items, library rooms and paid community tiers are locked
 * (app_config key "paywalls"; off while testing). Locked if unknown.
 */
export async function getPaywalls(): Promise<boolean> {
  const { data, error } = await supabase.from('app_config').select('value').eq('key', 'paywalls').maybeSingle();
  if (error || !data) return true;
  return data.value !== false;
}
