import { statusBadgeClass } from '../utils/format';
import { useLanguage } from '../i18n/LanguageContext';

export function Badge({ children, className = '' }) {
  const { t } = useLanguage();
  const raw = String(children ?? '');
  const cls = className || statusBadgeClass(raw);
  const translated = t(`status.${raw}`) !== `status.${raw}` ? t(`status.${raw}`) : raw;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {translated}
    </span>
  );
}

export default Badge;