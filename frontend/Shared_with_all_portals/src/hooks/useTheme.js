import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'krishi-theme';
const DARK = 'dark';
const LIGHT = 'light';

function storedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === DARK || value === LIGHT ? value : null;
  } catch {
    return null;
  }
}

function preferredTheme() {
  return storedTheme() || (window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
  const theme = preferredTheme();
  applyTheme(theme);
  return theme;
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || initializeTheme());

  useEffect(() => {
    const onStorage = event => {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue === DARK ? DARK : LIGHT;
      applyTheme(next);
      setTheme(next);
    };
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = event => {
      if (storedTheme()) return;
      const next = event.matches ? DARK : LIGHT;
      applyTheme(next);
      setTheme(next);
    };
    window.addEventListener('storage', onStorage);
    media.addEventListener('change', onSystemChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      media.removeEventListener('change', onSystemChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(current => {
      const next = current === DARK ? LIGHT : DARK;
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch { /* The selected theme still applies for the current page. */ }
      return next;
    });
  }, []);

  return { theme, isDark: theme === DARK, toggleTheme };
}
