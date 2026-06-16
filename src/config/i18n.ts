import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from '@/locales/id.json';
import en from '@/locales/en.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('garda-lang') : null;
const defaultLang = savedLang || 'id';

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: defaultLang,
  fallbackLng: 'id',
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
