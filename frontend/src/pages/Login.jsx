import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
  const { login, token } = useAuth();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t('login.failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh flex items-center justify-center bg-gradient-to-br from-orange-100 via-amber-50 to-brand-100 p-4 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="absolute top-3 right-3">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-white shadow-lg flex items-center justify-center text-4xl">
            🐔
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">{settings.farmName || t('layout.farmName')}</h1>
          <p className="mt-1 text-sm text-slate-600">{settings.location || 'Namakkal, Tamil Nadu, India'}</p>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-800">{t('login.adminLogin')}</h2>
          <p className="text-sm text-slate-500">{t('login.signInTo')}</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="username">
                {t('login.enterUsernameLabel')}
              </label>
              <input
                id="username"
                className="input"
                placeholder={t('login.enterUsername')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                {t('login.enterPasswordLabel')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-16"
                  placeholder={t('login.enterPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? t('login.hide') : t('login.show')}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">{t('login.footer')}</p>
      </div>
    </div>
  );
}