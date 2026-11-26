import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

const fallbackSettings = {
  farmName: 'BALASUBRAMANI POULTRY',
  location: 'Namakkal, Tamil Nadu, India',
  currency: 'INR',
  eggUnit: 'Egg',
  contact: '',
  phone: '',
  defaultLocalSellingPrice: 0,
  minimumEggStock: 0,
  minimumFeedStock: 0,
};

export function SettingsProvider({ children }) {
  const { token } = useAuth();
  const [settings, setSettings] = useState(fallbackSettings);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = token ? await settingsApi.get() : await settingsApi.getPublic();
      setSettings({ ...fallbackSettings, ...data.settings });
    } catch {
      // keep fallbacks
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);