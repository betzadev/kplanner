import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  initTheme: () => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyThemeToDocument(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themePreference: 'system',
  resolvedTheme: 'light',

  setThemePreference: (theme: ThemePreference) => {
    localStorage.setItem('kplanner_theme_preference', theme);
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyThemeToDocument(resolved);
    set({
      themePreference: theme,
      resolvedTheme: resolved,
    });
  },

  initTheme: () => {
    const saved = localStorage.getItem('kplanner_theme_preference') as ThemePreference | null;
    const pref: ThemePreference = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    const resolved = pref === 'system' ? getSystemTheme() : pref;
    applyThemeToDocument(resolved);

    set({
      themePreference: pref,
      resolvedTheme: resolved,
    });

    // Listen to OS system theme changes on PC and Android/iOS
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (get().themePreference === 'system') {
          const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
          applyThemeToDocument(newResolved);
          set({ resolvedTheme: newResolved });
        }
      };

      mediaQuery.addEventListener('change', listener);
    }
  },
}));
