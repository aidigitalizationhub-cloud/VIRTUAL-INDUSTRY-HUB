import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English loaded statically as default fallback
import enCommon from './locales/en/common.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ak', label: 'Twi', flag: '🇬🇭' },
  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪' }
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const loadedLanguages = new Set<string>(['en']);

export const languageCode = (lng: string): LanguageCode => {
  const code = lng.split('-')[0].toLowerCase();
  return (SUPPORTED_LANGUAGES.some((language) => language.code === code) ? code : 'en') as LanguageCode;
};

export const isLanguageLoaded = (lng: string): boolean => loadedLanguages.has(languageCode(lng));

// Dynamic async loader for non-English bundles to optimize performance & bundle size
export const loadLanguageAsync = async (lng: string): Promise<void> => {
  const code = languageCode(lng);
  const isValidCode = SUPPORTED_LANGUAGES.some(l => l.code === code);
  
  if (!isValidCode || loadedLanguages.has(code)) {
    return;
  }

  try {
    let bundle: Record<string, any>;
    switch (code) {
      case 'fr':
        bundle = (await import('./locales/fr/common.json')).default;
        break;
      case 'ak':
        bundle = (await import('./locales/ak/common.json')).default;
        break;
      case 'sw':
        bundle = (await import('./locales/sw/common.json')).default;
        break;
      default:
        return;
    }
    i18n.addResourceBundle(code, 'common', bundle, true, true);
    loadedLanguages.add(code);
  } catch (error) {
    console.error(`[i18n] Error dynamic loading translation bundle for "${code}":`, error);
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'ak', 'sw'],
    defaultNS: 'common',
    ns: ['common'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Automatically trigger dynamic load when language changes
i18n.on('languageChanged', (lng) => {
  if (lng) {
    loadLanguageAsync(languageCode(lng));
  }
});

// Load initially detected language if it's not English
const initialLng = i18n.language ? languageCode(i18n.language) : 'en';
if (initialLng && initialLng !== 'en') {
  loadLanguageAsync(initialLng);
}

export default i18n;
