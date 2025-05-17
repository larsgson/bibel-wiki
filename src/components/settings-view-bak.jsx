import { useTranslation, Trans } from 'react-i18next';
import { useState, Suspense } from 'react';
import ISO6391 from 'iso-639-1';

export default function SettingsView() {
  const { t, i18n } = useTranslation();
  const [count, setCounter] = useState(0);
  const langsList = i18n?.options?.supportedLngs
  
  return (
    <div className="App">
      <header className="App-header">
        <div>
          {langsList.filter((lng)=>lng!=="cimode").map((lng) => {
            const lng2letters = lng.slice(0,2)
            const nativeStr = ISO6391.getNativeName(lng2letters)
            const engStr = ISO6391.getName(lng2letters)
            let useLangName = `${nativeStr} - ${engStr}`
            if (lng.length>3) {
              const countryCode = lng.slice(3,5)
              useLangName = `${nativeStr} (${countryCode}) - ${engStr}`
            }
            return (
              <button key={lng} style={{ fontWeight: i18n.language === lng ? 'bold' : 'normal' }} type="submit" onClick={() => {
                i18n.changeLanguage(lng);
                setCounter(count + 1);
              }}>
                {useLangName}
              </button>
            )
          })}
        </div>
      </header>
      <div>
      <button onClick={() => window.open("https://github.com/larsgson/bibel-wiki/blob/main/roadmap.md", "_blank")}>
        Road map
      </button>
      </div>
    </div>
  );
}
