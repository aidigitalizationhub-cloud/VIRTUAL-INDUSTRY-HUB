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

// Dynamic async loader for non-English bundles to optimize performance & bundle size
export const loadLanguageAsync = async (lng: string): Promise<void> => {
  const code = lng.split('-')[0].toLowerCase();
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
    const code = lng.split('-')[0].toLowerCase();
    loadLanguageAsync(code);
  }
});

// Load initially detected language if it's not English
const initialLng = i18n.language ? i18n.language.split('-')[0].toLowerCase() : 'en';
if (initialLng && initialLng !== 'en') {
  loadLanguageAsync(initialLng);
}

export default i18n;
