import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { DateTime } from 'luxon';
import { enText, deText, esText, ptBRText } from '@bibel-wiki/i18n'

i18n
  // i18next-http-backend
  // loads translations from your server
  // https://github.com/i18next/i18next-http-backend
  .use(Backend)
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: false,
    fallbackLng: 'en',
    supportedLngs: ['en',"de","es"],
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
      format: (value, format, lng) => {
        if (value instanceof Date) {
          return DateTime.fromJSDate(value).setLocale(lng).toLocaleString(DateTime[format])
        }
        return value;
      }
    },

    react: {
      wait: true,
      bindI18n: "languageChanged loaded",
      bindStore: "added removed",
      nsMode: "default",
    },

    resources: {
      en: { translation: {...enText} },
      de: { translation: {...deText} },
      es: { translation: {...esText} },
      pt_BR: { translation: {...ptBRText} },
    }
  });

// i18n
//   //  .use(XHR)
//   // and check https://github.com/i18next/i18next-browser-languageDetector for client side !!!
//   // and this https://github.com/i18next/i18next-browser-languageDetector/issues/150
//   .use(initReactI18next) // if not using I18nextProvider
//   .init({
//     // lng: locale2.slice(0,2),
//     // lng: "en",
//     // fallbackLng: "en",
//     lng: "de",
//     fallbackLng: "de",
//     debug: true,

//     },
//   });

export default i18n;
