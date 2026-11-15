import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

type SessionState = {
  session: Session | null;
  /** True once the persisted session has been read from storage. */
  ready: boolean;
  /** Set while handling a password-recovery link. */
  recovering: boolean;
  setRecovering: (value: boolean) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  ready: false,
  recovering: false,
  setRecovering: (recovering) => set({ recovering }),
}));

let started = false;

/** Subscribe once to Supabase auth and mirror it into the store. */
export function startSessionListener() {
  if (started) return;
  started = true;
  supabase.auth
    .getSession()
    .then(({ data }) => useSessionStore.setState({ session: data.session, ready: true }))
    .catch(() => useSessionStore.setState({ session: null, ready: true }));
  supabase.auth.onAuthStateChange((event, session) => {
    useSessionStore.setState({ session, ready: true, ...(event === 'PASSWORD_RECOVERY' ? { recovering: true } : {}) });
  });
}

export function useUserId(): string {
  const id = useSessionStore((s) => s.session?.user.id);
  if (!id) throw new Error('useUserId called outside an authenticated route');
  return id;
}
