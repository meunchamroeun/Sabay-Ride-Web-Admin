import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { config, type Locale } from "@/config/env";
import en from "./locales/en.json";
import km from "./locales/km.json";

export const LOCALE_STORAGE_KEY = "sabayride.admin.locale";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { km: { translation: km }, en: { translation: en } },
    // Always render Khmer first (server and first client paint match), then apply the saved choice.
    lng: config.defaultLocale,
    fallbackLng: "en",
    supportedLngs: [...config.locales],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export function readSavedLocale(): Locale | null {
  try {
    const v = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return v === "km" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

export function setLocale(locale: Locale) {
  i18n.changeLanguage(locale);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
  document.documentElement.lang = locale;
}

export default i18n;
