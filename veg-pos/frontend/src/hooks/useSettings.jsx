import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getSettings } from '../api/settings';
import { useAuth } from './useAuth';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('veg_pos_settings');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const reloadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getSettings();
      setSettings(data);
      localStorage.setItem('veg_pos_settings', JSON.stringify(data));
      return data;
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      reloadSettings();
    } else {
      setSettings(null);
      localStorage.removeItem('veg_pos_settings');
    }
  }, [user, reloadSettings]);

  const companyName = (() => {
    if (!settings) return t('app_title');
    const isTamil = i18n.language === 'ta';
    if (isTamil) {
      return settings.company_name_ta?.trim() || settings.company_name_en?.trim() || t('app_title');
    }
    return settings.company_name_en?.trim() || settings.company_name_ta?.trim() || t('app_title');
  })();

  return (
    <SettingsContext.Provider value={{ settings, companyName, reloadSettings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    return {
      settings: null,
      companyName: '',
      reloadSettings: () => Promise.resolve(),
      setSettings: () => {},
    };
  }
  return ctx;
}
