import { useLanguage } from '../i18n/LanguageContext';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-4', lg: 'h-12 w-12 border-4' };
  return (
    <div className={`${sizes[size]} animate-spin rounded-full border-brand-500 border-t-transparent ${className}`} />
  );
}

export function LoadingBox({ label }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Spinner />
      <p className="mt-3 text-sm font-medium">{label || t('common.loading')}</p>
    </div>
  );
}

export function ErrorBox({ message = 'Something went wrong.', onRetry }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-red-500 text-3xl">⚠</div>
      <p className="mt-2 text-sm font-semibold text-red-600">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-4" onClick={onRetry}>
          {t('common.refresh')}
        </button>
      )}
    </div>
  );
}