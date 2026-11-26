import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const THEME_KEY = 'bp_theme';
const DENSITY_KEY = 'bp_density';

const AppearanceContext = createContext(null);

export function AppearanceProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch {
      return 'light';
    }
  });
  const [density, setDensity] = useState(() => {
    try {
      return localStorage.getItem(DENSITY_KEY) || 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  useEffect(() => {
    try {
      if (theme === 'system') {
        const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', dark);
      } else {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      /* ignore */
    }
  }, [density]);

  const setThemePref = useCallback((v) => setTheme(v), []);
  const setDensityPref = useCallback((v) => setDensity(v), []);

  return (
    <AppearanceContext.Provider
      value={{ theme, density, setThemePref, setDensityPref }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => useContext(AppearanceContext);