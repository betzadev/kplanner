import { create } from 'zustand';
import { LanguageCode, translations, TranslationDict } from '../i18n';

interface LanguageState {
  language: LanguageCode;
  t: TranslationDict;
  setLanguage: (lang: LanguageCode) => void;
  initLanguage: () => void;
}

function detectSystemLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'en';
  const navLang = (navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || 'en').toLowerCase();
  if (navLang.startsWith('ko')) return 'ko';
  if (navLang.startsWith('es')) return 'es';
  if (navLang.startsWith('pt')) return 'pt';
  if (navLang.startsWith('ja')) return 'ja';
  if (navLang.startsWith('zh')) return 'zh';
  if (navLang.startsWith('hi')) return 'hi';
  if (navLang.startsWith('fr')) return 'fr';
  return 'en';
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',
  t: translations.en,

  setLanguage: (lang: LanguageCode) => {
    localStorage.setItem('kplanner_language_preference', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    set({
      language: lang,
      t: translations[lang] || translations.en,
    });
  },

  initLanguage: () => {
    const saved = localStorage.getItem('kplanner_language_preference') as LanguageCode | null;
    const validCodes: LanguageCode[] = ['en', 'es', 'pt', 'ko', 'ja', 'zh', 'hi', 'fr'];
    const selected: LanguageCode = saved && validCodes.includes(saved) ? saved : detectSystemLanguage();

    if (typeof document !== 'undefined') {
      document.documentElement.lang = selected;
    }

    set({
      language: selected,
      t: translations[selected] || translations.en,
    });
  },
}));
