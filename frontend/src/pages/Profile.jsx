import { useState } from 'react';
import { authApi, getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import PageHeader from '../components/PageHeader';
import Field from '../components/Field';
import Icon from '../components/Icon';

export default function Profile() {
  const { admin, refreshAdmin } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [profile, setProfile] = useState({
    name: admin?.name || '',
    email: admin?.email || '',
    phone: admin?.phone || '',
  });
  const [password, setPassword] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [error, setError] = useState(null);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await authApi.updateMe(profile);
      setProfile({ name: data.admin.name, email: data.admin.email || '', phone: data.admin.phone || '' });
      await refreshAdmin();
      toast.success(t('profile.saved'));
    } catch (err) {
      setError(getErrorMessage(err, t('profile.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.newPassword.length < 6) {
      setError(t('profile.validationMin'));
      return;
    }
    if (password.newPassword !== password.confirm) {
      setError(t('profile.validation'));
      return;
    }
    setSavingPw(true);
    try {
      await authApi.updateMe({ oldPassword: password.oldPassword, password: password.newPassword });
      setPassword({ oldPassword: '', newPassword: '', confirm: '' });
      toast.success(t('profile.passwordChanged'));
    } catch (err) {
      setError(getErrorMessage(err, t('profile.saveError')));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <div className="max-w-2xl space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={saveProfile} className="card p-5 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Icon name="profile" className="h-4 w-4 text-brand-600" /> {t('profile.accountDetails')}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('profile.usernameLocked')}>
              <input className="input" value={admin?.username || ''} disabled />
            </Field>
            <Field label={t('profile.role')}>
              <input className="input" value="Admin" disabled />
            </Field>
            <Field label={t('profile.adminName')}>
              <input className="input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label={t('profile.email')}>
              <input className="input" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
            </Field>
            <Field label={t('profile.phone')}>
              <input className="input" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
            </Field>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('common.saving') : t('profile.update')}
            </button>
          </div>
        </form>

        <form onSubmit={savePassword} className="card p-5 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Icon name="settings" className="h-4 w-4 text-brand-600" /> {t('profile.changePassword')}
          </h3>
          <Field label={t('profile.currentPassword')}>
            <input className="input" type="password" value={password.oldPassword} onChange={(e) => setPassword((p) => ({ ...p, oldPassword: e.target.value }))} required />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('profile.newPasswordMin')}>
              <input className="input" type="password" value={password.newPassword} onChange={(e) => setPassword((p) => ({ ...p, newPassword: e.target.value }))} required />
            </Field>
            <Field label={t('profile.confirmPassword')}>
              <input className="input" type="password" value={password.confirm} onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))} required />
            </Field>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-secondary" disabled={savingPw}>
              {savingPw ? t('profile.updating') : t('profile.changePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}