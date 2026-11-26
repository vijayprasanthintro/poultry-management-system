import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, LANGUAGES, t } = useLanguage();
  return (
    <div className="flex items-center gap-1">
      <span className="text-base leading-none" aria-hidden="true">🌐</span>
      <select
        className="input !w-auto !py-1.5 text-xs font-semibold"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label={t('language.label')}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
      {!compact && <span className="hidden sm:block text-xs text-slate-500">{t('language.label')}</span>}
    </div>
  );
}