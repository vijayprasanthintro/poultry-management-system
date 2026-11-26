import { useLanguage } from '../i18n/LanguageContext';

const RANGE_KEYS = ['today', 'yesterday', 'last7', 'last30', 'month', 'year', 'custom'];

export default function DateRangeSelect({ value = 'today', onChange, from, to }) {
  const { t } = useLanguage();
  const isCustom = value === 'custom';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input !w-auto"
        value={value}
        onChange={(e) => onChange({ range: e.target.value })}
      >
        {RANGE_KEYS.map((r) => (
          <option key={r} value={r === 'last7' ? '7' : r === 'last30' ? '30' : r}>
            {t(`common.${r}`)}
          </option>
        ))}
      </select>
      {isCustom && (
        <>
          <input
            type="date"
            className="input !w-auto"
            value={from || ''}
            onChange={(e) => onChange({ from: e.target.value })}
          />
          <span className="text-sm text-slate-500">{t('common.to')}</span>
          <input
            type="date"
            className="input !w-auto"
            value={to || ''}
            onChange={(e) => onChange({ to: e.target.value })}
          />
        </>
      )}
    </div>
  );
}