import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import en from './en';

/**
 * English is the source language. pt-PT, pt-BR and es are added as files with
 * the same shape as en.ts and registered in `resources`; until then every
 * locale falls back to English.
 */
export const resources = { en: { translation: en } } as const;

function deviceLanguage() {
  try {
    const tag = getLocales()[0]?.languageTag ?? 'en';
    return tag in resources ? tag : (tag.split('-')[0] ?? 'en');
  } catch {
    return 'en';
  }
}

const i18n = createInstance();
void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnObjects: true,
    initAsync: false,
  });

export { i18n, useTranslation };
export const t = i18n.t.bind(i18n) as typeof i18n.t;
