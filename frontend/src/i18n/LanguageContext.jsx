import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { translations, LANGUAGES } from './translations';
import { useSettings } from '../context/SettingsContext';

const STORAGE_KEY = 'poultry_lang';

const resolve = (obj, key) =>
  key.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

function LanguageProvider({ children }) {
  const { settings } = useSettings();
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && translations[saved]) return saved;
    } catch {
      /* ignore */
    }
    return 'en';
  });

  // Apply the farm's configured default language when the user has no local preference.
  useEffect(() => {
    const defaultLang = settings?.defaultLanguage;
    if (!defaultLang || !translations[defaultLang]) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setLangState(defaultLang);
      }
    } catch {
      /* ignore */
    }
  }, [settings?.defaultLanguage]);

  const setLang = useCallback((code) => {
    if (translations[code]) {
      setLangState(code);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = translations[lang] || translations.en;
      let str = resolve(dict, key);
      if (str === undefined) str = resolve(translations.en, key);
      if (str === undefined) return key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = String(str).split(`{${k}}`).join(String(v));
        });
      }
      return str;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, LANGUAGES }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

const LanguageContext = createContext(null);
export default LanguageProvider;
export const useLanguage = () => useContext(LanguageContext);