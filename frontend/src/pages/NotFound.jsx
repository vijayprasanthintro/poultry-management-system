import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { useLanguage } from '../i18n/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-brand-600">
          <Icon name="egg" className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-5xl font-extrabold text-slate-900">404</h1>
        <p className="mt-2 text-slate-500">
          {t('notfound.hint')}
        </p>
        <Link to="/" className="btn-primary mt-6">
          {t('notfound.backHome')}
        </Link>
      </div>
    </div>
  );
}