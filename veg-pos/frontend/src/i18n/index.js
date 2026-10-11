import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ta from './ta.json';
import en from './en.json';

const savedLang = localStorage.getItem('veg_pos_lang') || 'ta';

i18n.use(initReactI18next).init({
  resources: {
    ta: { translation: ta },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'ta',
  interpolation: { escapeValue: false },
});

export function setAppLanguage(lang) {
  localStorage.setItem('veg_pos_lang', lang);
  i18n.changeLanguage(lang);
}

export default i18n;
