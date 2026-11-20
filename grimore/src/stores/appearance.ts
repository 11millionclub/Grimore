import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Appearance = 'dark' | 'light' | 'system';

type AppearanceState = {
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
};

/** Per-device display preference. Dark is the default look. */
export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      appearance: 'dark',
      setAppearance: (appearance) => set({ appearance }),
    }),
    { name: 'grimore-appearance', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
