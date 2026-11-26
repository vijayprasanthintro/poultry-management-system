import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsApi, setsApi, authApi, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useAppearance } from '../context/AppearanceContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Field from '../components/Field';
import SectionCard from '../components/settings/SectionCard';
import Toggle from '../components/settings/Toggle';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Icon from '../components/Icon';
import { LoadingBox, ErrorBox } from '../components/Spinner';
import { Badge } from '../components/Badge';
import { num, todayInput } from '../utils/format';

const SECTIONS = [
  { id: 'farm', emoji: '🏠', labelKey: 'settings.farmProfile' },
  { id: 'preferences', emoji: '⚙️', labelKey: 'settings.farmPreferences' },
  { id: 'poultry', emoji: '🐓', labelKey: 'settings.poultrySettings' },
  { id: 'mortality', emoji: '💀', labelKey: 'settings.mortalitySettings' },
  { id: 'egg', emoji: '🥚', labelKey: 'settings.eggSettings' },
  { id: 'feed', emoji: '🌾', labelKey: 'settings.feedSettings' },
  { id: 'labour', emoji: '🧾', labelKey: 'settings.labourSettings' },
  { id: 'sales', emoji: '💰', labelKey: 'settings.salesSettings' },
  { id: 'notifications', emoji: '🔔', labelKey: 'settings.notificationSettings' },
  { id: 'region', emoji: '🌍', labelKey: 'settings.regionSettings' },
  { id: 'appearance', emoji: '🎨', labelKey: 'settings.appearanceSettings' },
  { id: 'security', emoji: '🔒', labelKey: 'settings.securitySettings' },
  { id: 'data', emoji: '🗄️', labelKey: 'settings.dataSettings' },
  { id: 'about', emoji: 'ℹ️', labelKey: 'settings.aboutSettings' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD'];
const PERIODS = ['today', 'week', 'month', 'quarter', 'year', 'custom'];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const TIME_FORMATS = ['12h', '24h'];
const TIMEZONES = ['Asia/Kolkata', 'Asia/Kuala_Lumpur', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'UTC'];
const UNITS = ['KG', 'GRAMS', 'BAGS'];
const SELL_UNITS = ['Egg', 'Piece', 'Tray', 'Crate', 'Box'];
const FEED_TYPES = ['Starter', 'Grower', 'Layer Mash', 'Layer Pellet', 'Broiler Starter', 'Broiler Finisher', 'PK', 'Hybrid', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Credit', 'Cheque'];
const EXPENSE_CATEGORIES = ['Feed', 'Medicine', 'Electricity', 'Maintenance', 'Transport', 'Staff', 'Miscellaneous'];

const NOTIF_FARM = [
  ['lowEggStock', 'settings.lowEggStock'],
  ['lowFeedStock', 'settings.lowFeedStock'],
  ['highMortality', 'settings.highMortality'],
  ['pendingPayment', 'settings.pendingPayment'],
  ['labourExpense', 'settings.labourExpenseNotif'],
  ['expenseAlerts', 'settings.expenseAlerts'],
];
const NOTIF_SYSTEM = [
  ['successNotifications', 'settings.successNotifications'],
  ['errorNotifications', 'settings.errorNotifications'],
  ['reminderNotifications', 'settings.reminderNotifications'],
];

function useDraft(initial) {
  const [values, setValues] = useState(initial);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setValues(initial);
    setDirty(false);
  }, [initial]);
  const patch = (p) => {
    setValues((v) => ({ ...v, ...p }));
    setDirty(true);
  };
  const reset = () => {
    setValues(initial);
    setDirty(false);
  };
  return { values, patch, reset, dirty };
}

const toNumber = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v) || 0);

function FormActions({ onSave, onCancel, saving, dirty }) {
  const { t } = useLanguage();
  return (
    <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
        {t('settings.cancelChanges')}
      </button>
      <button type="button" className="btn-primary" onClick={onSave} disabled={saving || !dirty}>
        {saving ? t('common.saving') : t('settings.saveSettingsBtn')}
      </button>
    </div>
  );
}

export default function Settings() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { settings, loading, refresh } = useSettings();
  const { updateToken } = useAuth();
  const [active, setActive] = useState('farm');
  const [dirtySections, setDirtySections] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [pendingSection, setPendingSection] = useState(null);

  const anyDirty = Object.values(dirtySections).some(Boolean);

  useEffect(() => {
    const handler = (e) => {
      if (!anyDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [anyDirty]);

  const reportDirty = (id, dirty) =>
    setDirtySections((p) => (p[id] === dirty ? p : { ...p, [id]: dirty }));

  const clearDirty = (id) =>
    setDirtySections((p) => (p[id] ? { ...p, [id]: false } : p));

  const requestSection = (id) => {
    if (id === active) return;
    if (anyDirty) {
      setPendingSection(id);
    } else {
      setActive(id);
      window.scrollTo(0, 0);
    }
  };

  const handleSave = async (payload) => {
    const sectionId = activeSection.id;
    setSavingId(sectionId);
    try {
      await settingsApi.update(payload);
      toast.success(t('settings.saved'));
      await refresh();
      clearDirty(sectionId);
    } catch (err) {
      toast.error(getErrorMessage(err, t('settings.saveError')));
    } finally {
      setSavingId(null);
    }
  };

  const activeSection = SECTIONS.find((s) => s.id === active);

  if (loading) return <LoadingBox label={t('settings.loading')} />;

  const sectionProps = {
    settings,
    onSave: handleSave,
    saving: savingId === activeSection.id,
    onDirtyChange: (d) => reportDirty(activeSection.id, d),
    navigate,
    updateToken,
  };

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      {anyDirty && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {t('settings.savedChanges')}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => requestSection(s.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                  active === s.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{s.emoji}</span>
                <span className="truncate">{t(s.labelKey)}</span>
                {dirtySections[s.id] && (
                  <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                )}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <select
            className="input lg:hidden"
            value={active}
            onChange={(e) => requestSection(e.target.value)}
          >
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {t(s.labelKey)}
                {dirtySections[s.id] ? ' •' : ''}
              </option>
            ))}
          </select>

          {active === 'farm' && <FarmProfileSection {...sectionProps} />}
          {active === 'preferences' && <FarmPreferencesSection {...sectionProps} />}
          {active === 'poultry' && <PoultrySetsSection {...sectionProps} />}
          {active === 'mortality' && <MortalitySection {...sectionProps} />}
          {active === 'egg' && <EggSection {...sectionProps} />}
          {active === 'feed' && <FeedSection {...sectionProps} />}
          {active === 'labour' && <LabourSection {...sectionProps} />}
          {active === 'sales' && <SalesSection {...sectionProps} />}
          {active === 'notifications' && <NotificationsSection {...sectionProps} />}
          {active === 'region' && <RegionSection {...sectionProps} />}
          {active === 'appearance' && <AppearanceSection {...sectionProps} />}
          {active === 'security' && <SecuritySection {...sectionProps} />}
          {active === 'data' && <DataSection {...sectionProps} />}
          {active === 'about' && <AboutSection {...sectionProps} />}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingSection)}
        onClose={() => setPendingSection(null)}
        danger={false}
        title={t('settings.unsavedConfirmTitle')}
        message={t('settings.unsavedConfirmMsg')}
        confirmText={t('settings.leaveWithoutSaving')}
        onConfirm={() => {
          setDirtySections({});
          const next = pendingSection;
          setPendingSection(null);
          setActive(next);
          window.scrollTo(0, 0);
        }}
      />
    </div>
  );
}

function FarmProfileSection({ settings, onSave, saving, onDirtyChange }) {
  const toast = useToast();
  const { t } = useLanguage();
  const initial = useMemo(
    () => ({
      ownerName: settings.ownerName || '',
      farmName: settings.farmName || '',
      farmAddress: settings.farmAddress || '',
      villageTown: settings.villageTown || '',
      district: settings.district || '',
      state: settings.state || '',
      pincode: settings.pincode || '',
      email: settings.email || '',
      registrationNumber: settings.registrationNumber || '',
      contact: settings.contact || '',
      phone: settings.phone || '',
      location: settings.location || '',
      farmLogo: settings.farmLogo || '',
    }),
    [settings]
  );
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const setF = (k) => (e) => patch({ [k]: e.target.value });

  const uploadLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      toast.error(t('settings.uploadLogo'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ farmLogo: reader.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <SectionCard emoji="🏠" title={t('settings.farmProfile')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${t('settings.farmName')} *`}>
          <input className="input" value={values.farmName} onChange={setF('farmName')} />
        </Field>
        <Field label={t('settings.ownerName')}>
          <input className="input" value={values.ownerName} onChange={setF('ownerName')} />
        </Field>
        <Field label={t('settings.farmAddress')}>
          <textarea className="input min-h-[70px]" value={values.farmAddress} onChange={setF('farmAddress')} />
        </Field>
        <Field label={t('settings.villageTown')}>
          <input className="input" value={values.villageTown} onChange={setF('villageTown')} />
        </Field>
        <Field label={t('settings.district')}>
          <input className="input" value={values.district} onChange={setF('district')} />
        </Field>
        <Field label={t('settings.state')}>
          <input className="input" value={values.state} onChange={setF('state')} />
        </Field>
        <Field label={t('settings.pincode')}>
          <input className="input" value={values.pincode} onChange={setF('pincode')} />
        </Field>
        <Field label={t('settings.email')}>
          <input className="input" type="email" value={values.email} onChange={setF('email')} />
        </Field>
        <Field label={t('settings.registrationNumber')}>
          <input className="input" value={values.registrationNumber} onChange={setF('registrationNumber')} />
        </Field>
        <Field label={t('common.notes')}>
          <input className="input" value={values.location} onChange={setF('location')} />
        </Field>
        <div className="sm:col-span-2">
          <label className="label">{t('settings.farmLogo')}</label>
          <div className="mt-1 flex items-center gap-3">
            {values.farmLogo ? (
              <img
                src={values.farmLogo}
                alt="logo"
                className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xl text-slate-300">
                🐔
              </span>
            )}
            <label className="btn-secondary cursor-pointer !py-2 text-xs">
              {t('settings.uploadLogo')}
              <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
            </label>
            {values.farmLogo && (
              <button
                type="button"
                className="btn-ghost !px-2 !text-red-600"
                onClick={() => patch({ farmLogo: '' })}
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <FormActions
        onSave={() =>
          onSave({
            ownerName: values.ownerName,
            farmName: values.farmName,
            farmAddress: values.farmAddress,
            villageTown: values.villageTown,
            district: values.district,
            state: values.state,
            pincode: values.pincode,
            email: values.email,
            registrationNumber: values.registrationNumber,
            contact: values.contact,
            phone: values.phone,
            location: values.location,
            farmLogo: values.farmLogo,
          })
        }
        onCancel={reset}
        saving={saving}
        dirty={dirty}
      />
    </SectionCard>
  );
}

function FarmPreferencesSection({ settings, onSave, saving, onDirtyChange }) {
  const { t } = useLanguage();
  const { data } = useFetch(setsApi.getAll);
  const sets = data?.sets || [];

  const initial = useMemo(
    () => ({
      defaultSetId: settings.defaultSetId || '',
      defaultDashboardPeriod: settings.defaultDashboardPeriod || 'today',
      dateFormat: settings.dateFormat || 'DD/MM/YYYY',
      timeFormat: settings.timeFormat || '12h',
      timezone: settings.timezone || 'Asia/Kolkata',
      weightUnit: settings.weightUnit || 'KG',
      feedUnit: settings.feedUnit || 'KG',
      currency: settings.currency || 'INR',
      eggUnit: settings.eggUnit || 'Egg',
      defaultLanguage: settings.defaultLanguage || 'en',
      defaultMortalityReason: settings.defaultMortalityReason || '',
    }),
    [settings]
  );
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const reasons = settings.mortalityReasons?.filter((r) => r.enabled) || [];
  const setF = (k) => (e) => patch({ [k]: e.target.value });

  return (
    <SectionCard emoji="⚙️" title={t('settings.farmPreferences')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('settings.defaultSet')}>
          <select className="input" value={values.defaultSetId} onChange={setF('defaultSetId')}>
            <option value="">—</option>
            {sets.map((set) => (
              <option key={set._id} value={set._id}>
                {set.name}
                {set.status === 'INACTIVE' ? ` (${t('settings.setStatusInactive')})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.defaultDashboardPeriod')}>
          <select className="input" value={values.defaultDashboardPeriod} onChange={setF('defaultDashboardPeriod')}>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.dateFormat')}>
          <select className="input" value={values.dateFormat} onChange={setF('dateFormat')}>
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.timeFormat')}>
          <select className="input" value={values.timeFormat} onChange={setF('timeFormat')}>
            {TIME_FORMATS.map((f) => (
              <option key={f} value={f}>{f}-hour</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.timezone')}>
          <select className="input" value={values.timezone} onChange={setF('timezone')}>
            {TIMEZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.weightUnit')}>
          <select className="input" value={values.weightUnit} onChange={setF('weightUnit')}>
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.feedUnit')}>
          <select className="input" value={values.feedUnit} onChange={setF('feedUnit')}>
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.currency')}>
          <select className="input" value={values.currency} onChange={setF('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.eggUnit')}>
          <input className="input" value={values.eggUnit} onChange={setF('eggUnit')} placeholder="Egg" />
        </Field>
        <Field label={t('settings.defaultLanguage')}>
          <select className="input" value={values.defaultLanguage} onChange={setF('defaultLanguage')}>
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
            <option value="hi">हिन्दी</option>
          </select>
        </Field>
        <Field label={t('settings.defaultMortalityReason')}>
          <select className="input" value={values.defaultMortalityReason} onChange={setF('defaultMortalityReason')}>
            <option value="">—</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.label}>{r.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <FormActions onSave={() => onSave(values)} onCancel={reset} saving={saving} dirty={dirty} />
    </SectionCard>
  );
}

const emptySetForm = {
  name: '',
  birdCount: 0,
  breed: '',
  startingDate: todayInput(),
  house: '',
  age: 0,
  status: 'ACTIVE',
  notes: '',
};

function PoultrySetsSection({ onDirtyChange }) {
  const toast = useToast();
  const { t } = useLanguage();
  const { data, loading, error, refetch } = useFetch(setsApi.getAll);
  const sets = data?.sets || [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySetForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => onDirtyChange(false), [onDirtyChange]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptySetForm);
    setModalOpen(true);
  };
  const openEdit = (set) => {
    setEditing(set);
    setForm({
      name: set.name || '',
      birdCount: set.birdCount ?? 0,
      breed: set.breed || '',
      startingDate: set.startingDate ? String(set.startingDate).slice(0, 10) : todayInput(),
      house: set.house || '',
      age: set.age ?? 0,
      status: set.status || 'ACTIVE',
      notes: set.notes || '',
    });
    setModalOpen(true);
  };
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await setsApi.update(editing._id, form);
        toast.success(t('poultrysets.updated'));
      } else {
        await setsApi.create(form);
        toast.success(t('poultrysets.created'));
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, t('settings.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    try {
      if (confirm.action === 'deactivate') {
        await setsApi.remove(confirm.set._id);
        toast.success(t('poultrysets.deleted'));
      } else if (confirm.action === 'reactivate') {
        await setsApi.update(confirm.set._id, { status: 'ACTIVE' });
        toast.success(t('settings.saved'));
      }
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <SectionCard
      emoji="🐓"
      title={t('settings.poultrySettings')}
      actions={[
        <button key="add" className="btn-primary" onClick={openCreate}>
          <Icon name="plus" className="h-4 w-4" /> {t('poultrysets.addSet')}
        </button>,
      ]}
    >
      {error && <ErrorBox message={error} onRetry={() => refetch()} />}
      {!loading && !sets.length && (
        <p className="py-6 text-center text-sm text-slate-400">{t('settings.noSets')}</p>
      )}
      {!!sets.length && (
        <div className="space-y-2">
          {sets.map((set) => (
            <div key={set._id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{set.name}</span>
                  <Badge>{set.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {num(set.birdCount)} hens · started {num(set.startingBirdCount)}
                  {set.breed ? ` · ${set.breed}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {set.status === 'INACTIVE' ? (
                  <button
                    className="btn-ghost !px-2 text-xs font-semibold text-emerald-600"
                    onClick={() => setConfirm({ action: 'reactivate', set })}
                  >
                    {t('settings.enable')}
                  </button>
                ) : (
                  <button
                    className="btn-ghost !px-2 text-xs font-semibold text-slate-500"
                    onClick={() => setConfirm({ action: 'deactivate', set })}
                  >
                    {t('settings.disable')}
                  </button>
                )}
                <button className="btn-ghost !px-2" onClick={() => openEdit(set)} title={t('common.edit')}>
                  <Icon name="edit" className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('settings.editSetTitle') : t('settings.addSetTitle')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`${t('poultrysets.setName')} *`}>
              <input className="input" value={form.name} onChange={setField('name')} required placeholder="e.g. SET 1" />
            </Field>
            <Field label={t('poultrysets.birdCount')}>
              <input className="input" type="number" min="0" value={form.birdCount} onChange={setField('birdCount')} />
            </Field>
            <Field label={t('poultrysets.breed')}>
              <input className="input" value={form.breed} onChange={setField('breed')} placeholder="e.g. BV-300 Layer" />
            </Field>
            <Field label={t('poultrysets.startingDate')}>
              <input className="input" type="date" value={form.startingDate} onChange={setField('startingDate')} />
            </Field>
            <Field label={t('poultrysets.house')}>
              <input className="input" value={form.house} onChange={setField('house')} placeholder="e.g. House A" />
            </Field>
            <Field label={t('poultrysets.age')}>
              <input className="input" type="number" min="0" value={form.age} onChange={setField('age')} />
            </Field>
            <Field label={t('poultrysets.status')}>
              <select className="input" value={form.status} onChange={setField('status')}>
                <option value="ACTIVE">{t('status.ACTIVE')}</option>
                <option value="INACTIVE">{t('status.INACTIVE')}</option>
              </select>
            </Field>
          </div>
          <Field label={t('common.notes')}>
            <textarea className="input" rows="2" value={form.notes} onChange={setField('notes')} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirm?.action === 'deactivate' ? t('settings.deactivateSetTitle') : t('settings.reactivateSetTitle')}
        message={confirm?.action === 'deactivate' ? `"${confirm?.set?.name}" — ${t('settings.deactivateSetMsg')}` : `"${confirm?.set?.name}"`}
        confirmText={confirm?.action === 'deactivate' ? t('settings.disable') : t('settings.enable')}
      />
    </SectionCard>
  );
}

function MortalitySection({ settings, onSave, saving, onDirtyChange }) {
  const { t } = useLanguage();
  const { data } = useFetch(setsApi.getAll);
  const sets = data?.sets || [];
  const [removeTarget, setRemoveTarget] = useState(null);

  const initial = useMemo(
    () => ({
      mortalityAlertThreshold: String(settings.mortalityAlertThreshold ?? 0),
      defaultMortalityReason: settings.defaultMortalityReason || '',
      reasons: (settings.mortalityReasons && settings.mortalityReasons.length
        ? settings.mortalityReasons
        : []
      ).map((r) => ({ id: r.id, label: r.label, enabled: r.enabled !== false })).filter((r) => r.id),
    }),
    [settings]
  );
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const uid = () => `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const addReason = () =>
    patch({ reasons: [...values.reasons, { id: uid(), label: '', enabled: true }] });

  const updateReason = (id, upd) =>
    patch({ reasons: values.reasons.map((r) => (r.id === id ? { ...r, ...upd } : r)) });

  const setDefault = (id) => {
    const target = values.reasons.find((r) => r.id === id);
    patch({
      reasons: values.reasons.map((r) => ({ ...r, isDefault: r.id === id })),
      defaultMortalityReason: target?.label || '',
    });
  };

  const removeReason = (id) => {
    const target = values.reasons.find((r) => r.id === id);
    patch({
      reasons: values.reasons.filter((r) => r.id !== id),
      defaultMortalityReason:
        target && values.defaultMortalityReason === target.label ? '' : values.defaultMortalityReason,
    });
    setRemoveTarget(null);
  };

  const save = () =>
    onSave({
      mortalityAlertThreshold: toNumber(values.mortalityAlertThreshold),
      mortalityReasons: values.reasons
        .filter((r) => r.label.trim())
        .map((r) => ({ id: r.id, label: r.label.trim(), enabled: r.enabled, isDefault: Boolean(r.isDefault) })),
      defaultMortalityReason: values.defaultMortalityReason,
    });

  return (
    <SectionCard emoji="💀" title={t('settings.mortalitySettings')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('settings.mortalityAlertThreshold')} hint={t('settings.mortalityAlertHint')}>
          <input
            className="input"
            type="number"
            min="0"
            value={values.mortalityAlertThreshold}
            onChange={(e) => patch({ mortalityAlertThreshold: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">{t('settings.mortalityReasons')}</p>
            <p className="text-xs text-slate-400">{t('settings.mortalityReasonsHint')}</p>
          </div>
          <button className="btn-secondary !py-1.5 text-xs" onClick={addReason}>
            <Icon name="plus" className="h-3.5 w-3.5" /> {t('settings.addReason')}
          </button>
        </div>
        <div className="space-y-2">
          {!values.reasons.length && (
            <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
              {t('settings.reasonPlaceholder')}
            </p>
          )}
          {values.reasons.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
              <Toggle checked={r.enabled} onChange={(v) => updateReason(r.id, { enabled: v })} />
              <input
                className="input !py-1.5"
                value={r.label}
                placeholder={t('settings.reasonPlaceholder')}
                onChange={(e) => updateReason(r.id, { label: e.target.value })}
              />
              {r.isDefault && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                  {t('settings.default')}
                </span>
              )}
              {!r.isDefault && (
                <button
                  className="btn-ghost shrink-0 !px-2 text-[11px] font-semibold text-slate-500"
                  onClick={() => setDefault(r.id)}
                  disabled={!r.enabled || !r.label.trim()}
                >
                  {t('settings.setDefault')}
                </button>
              )}
              <button
                className="btn-ghost shrink-0 !px-2 !text-red-600"
                onClick={() => {
                  if (!r.label.trim()) return removeReason(r.id);
                  setRemoveTarget(r);
                }}
                title={t('common.delete')}
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-slate-800">{t('settings.henAllocation')}</p>
        <p className="text-xs text-slate-400">{t('settings.henAllocationHint')}</p>
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">{t('poultrysets.setName')}</th>
                <th className="px-3 py-2 text-right">{t('settings.henAllocation')}</th>
                <th className="px-3 py-2 text-right">{t('settings.records')}</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((set) => (
                <tr key={set._id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-700">{set.name}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{num(set.birdCount)}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{num(set.startingBirdCount)}</td>
                </tr>
              ))}
              {!sets.length && (
                <tr className="border-t border-slate-100">
                  <td colSpan="3" className="px-3 py-4 text-center text-xs text-slate-400">
                    {t('settings.noSets')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FormActions onSave={save} onCancel={reset} saving={saving} dirty={dirty} />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeReason(removeTarget.id)}
        title={t('settings.deleteReasonTitle')}
        message={t('settings.deleteReasonMsg')}
        confirmText={t('common.delete')}
      />
    </SectionCard>
  );
}

function EggSection({ settings, onSave, saving, onDirtyChange }) {
  const { t } = useLanguage();
  const initial = useMemo(
    () => ({
      defaultLocalSellingPrice: String(settings.defaultLocalSellingPrice ?? 0),
      localSellingPriceSource: settings.localSellingPriceSource || 'default',
      minimumEggStock: String(settings.minimumEggStock ?? 0),
      eggProductionTarget: String(settings.eggProductionTarget ?? 0),
      sellingUnit: settings.sellingUnit || 'Egg',
      eggUnit: settings.eggUnit || 'Egg',
    }),
    [settings]
  );
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const setF = (k) => (e) => patch({ [k]: e.target.value });

  return (
    <SectionCard emoji="🥚" title={t('settings.eggSettings')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${t('settings.defaultPrice')} (${settings.currency || 'INR'})`}>
          <input className="input" type="number" step="0.01" min="0" value={values.defaultLocalSellingPrice} onChange={setF('defaultLocalSellingPrice')} />
        </Field>
        <Field label={t('settings.priceSource')} hint={t('settings.priceSourceHint')}>
          <select className="input" value={values.localSellingPriceSource} onChange={setF('localSellingPriceSource')}>
            <option value="default">{t('settings.priceSourceDefault')}</option>
            <option value="market">{t('settings.priceSourceMarket')}</option>
          </select>
        </Field>
        <Field label={`${t('settings.minimumEggStock')} (${settings.eggUnit || 'Egg'})`} hint={t('settings.minimumEggHint')}>
          <input className="input" type="number" min="0" value={values.minimumEggStock} onChange={setF('minimumEggStock')} />
        </Field>
        <Field label={t('settings.eggProductionTarget')} hint={t('settings.eggProductionTargetHint')}>
          <input className="input" type="number" min="0" value={values.eggProductionTarget} onChange={setF('eggProductionTarget')} />
        </Field>
        <Field label={t('settings.sellingUnit')}>
          <select className="input" value={values.sellingUnit} onChange={setF('sellingUnit')}>
            {SELL_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.eggUnit')}>
          <input className="input" value={values.eggUnit} onChange={setF('eggUnit')} placeholder="Egg" />
        </Field>
      </div>
      <FormActions
        onSave={() =>
          onSave({
            defaultLocalSellingPrice: toNumber(values.defaultLocalSellingPrice),
            localSellingPriceSource: values.localSellingPriceSource,
            minimumEggStock: toNumber(values.minimumEggStock),
            eggProductionTarget: toNumber(values.eggProductionTarget),
            sellingUnit: values.sellingUnit,
            eggUnit: values.eggUnit,
          })
        }
        onCancel={reset}
        saving={saving}
        dirty={dirty}
      />
    </SectionCard>
  );
}

function FeedSection({ settings, onSave, saving, onDirtyChange }) {
  const { t } = useLanguage();
  const initial = useMemo(
    () => ({
      minimumFeedStock: String(settings.minimumFeedStock ?? 0),
      feedUnit: settings.feedUnit || 'KG',
      defaultFeedType: settings.defaultFeedType || '',
    }),
    [settings]
  );
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const setF = (k) => (e) => patch({ [k]: e.target.value });

  return (
    <SectionCard emoji="🌾" title={t('settings.feedSettings')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${t('settings.minimumFeedStock')} (${values.feedUnit})`} hint={t('settings.minimumFeedHint')}>
          <input className="input" type="number" step="0.5" min="0" value={values.minimumFeedStock} onChange={setF('minimumFeedStock')} />
        </Field>
        <Field label={t('settings.feedUnit')}>
          <select className="input" value={values.feedUnit} onChange={setF('feedUnit')}>
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.defaultFeedType')}>
          <select className="input" value={values.defaultFeedType} onChange={setF('defaultFeedType')}>
            <option value="">—</option>
            {FEED_TYPES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
      </div>
      <FormActions
        onSave={() =>
          onSave({
            minimumFeedStock: toNumber(values.minimumFeedStock),
            feedUnit: values.feedUnit,
            defaultFeedType: values.defaultFeedType,
          })
        }
        onCancel={reset}
        saving={saving}
        dirty={dirty}
      />
    </SectionCard>
  );
}

function LabourSection({ settings, onSave, saving, onDirtyChange }) {
  const { t } = useLanguage();
  const initial = useMemo(
    () => ({
      defaultWage: String(settings.defaultWage ?? 0),
      overtimeEnabled: settings.overtimeEnabled === 'true' || settings.overtimeEnabled === true,
    }),
    [settings]
  );
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  return (
    <SectionCard emoji="🧾" title={t('settings.labourSettings')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${t('settings.defaultWage')} (${settings.currency || 'INR'})`}>
          <input className="input" type="number" min="0" value={values.defaultWage} onChange={(e) => patch({ defaultWage: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 p-3">
        <p className="text-sm font-semibold text-slate-700">{t('settings.overtimeEnabled')}</p>
        <Toggle checked={values.overtimeEnabled} onChange={(v) => patch({ overtimeEnabled: v })} label={t('settings.overtimeEnabled')} />
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold text-slate-800">{t('settings.expenseCategories')}</p>
        <p className="text-xs text-slate-400">{t('settings.expenseCategoriesHint')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <span key={c} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
              {c}
            </span>
          ))}
        </div>
      </div>
      <FormActions
        onSave={() => onSave({ defaultWage: toNumber(values.defaultWage), overtimeEnabled: values.overtimeEnabled })}
        onCancel={reset}
        saving={saving}
        dirty={dirty}
      />
    </SectionCard>
  );
}

function SalesSection({ settings, onSave, saving, onDirtyChange }) {
  const { t } = useLanguage();
  const initial = useMemo(
    () => ({
      currency: settings.currency || 'INR',
      defaultPaymentMethod: settings.defaultPaymentMethod || 'Cash',
      invoicePrefix: settings.invoicePrefix || '',
    }),
    [settings]
  );
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const setF = (k) => (e) => patch({ [k]: e.target.value });

  return (
    <SectionCard emoji="💰" title={t('settings.salesSettings')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('settings.currency')}>
          <select className="input" value={values.currency} onChange={setF('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.defaultPaymentMethod')}>
          <select className="input" value={values.defaultPaymentMethod} onChange={setF('defaultPaymentMethod')}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.invoicePrefix')} hint={t('settings.invoicePrefixHint')}>
          <input className="input" value={values.invoicePrefix} onChange={setF('invoicePrefix')} placeholder="BSP-2026-" />
        </Field>
      </div>
      <FormActions onSave={() => onSave(values)} onCancel={reset} saving={saving} dirty={dirty} />
    </SectionCard>
  );
}

function NotificationsSection({ settings, onSave, saving, onDirtyChange }) {
  const { t } = useLanguage();
  const initial = useMemo(() => {
    const base = settings.notifications || {};
    const out = {};
    [...NOTIF_FARM, ...NOTIF_SYSTEM].forEach(([k]) => {
      out[k] = base[k] === undefined ? true : base[k];
    });
    return out;
  }, [settings]);
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const renderGroup = (title, items) => (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {items.map(([k, labelKey]) => (
          <div key={k} className="flex items-center justify-between gap-3 p-3">
            <span className="text-sm text-slate-700">{t(labelKey)}</span>
            <Toggle checked={values[k]} onChange={(v) => patch({ [k]: v })} label={t(labelKey)} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <SectionCard emoji="🔔" title={t('settings.notificationSettings')}>
      <div className="space-y-5">
        {renderGroup(t('settings.farmAlerts'), NOTIF_FARM)}
        {renderGroup(t('settings.systemNotifications'), NOTIF_SYSTEM)}
      </div>
      <FormActions onSave={() => onSave({ notifications: values })} onCancel={reset} saving={saving} dirty={dirty} />
    </SectionCard>
  );
}

function RegionSection({ settings, onSave, saving, onDirtyChange }) {
  const { t } = useLanguage();
  const initial = useMemo(
    () => ({
      defaultLanguage: settings.defaultLanguage || 'en',
      currency: settings.currency || 'INR',
      dateFormat: settings.dateFormat || 'DD/MM/YYYY',
      timeFormat: settings.timeFormat || '12h',
      timezone: settings.timezone || 'Asia/Kolkata',
    }),
    [settings]
  );
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const setF = (k) => (e) => patch({ [k]: e.target.value });

  return (
    <SectionCard emoji="🌍" title={t('settings.regionSettings')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('settings.defaultLanguage')}>
          <select className="input" value={values.defaultLanguage} onChange={setF('defaultLanguage')}>
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
            <option value="hi">हिन्दी</option>
          </select>
        </Field>
        <Field label={t('settings.currency')}>
          <select className="input" value={values.currency} onChange={setF('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.dateFormat')}>
          <select className="input" value={values.dateFormat} onChange={setF('dateFormat')}>
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.timeFormat')}>
          <select className="input" value={values.timeFormat} onChange={setF('timeFormat')}>
            {TIME_FORMATS.map((f) => (
              <option key={f} value={f}>{f}-hour</option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.timezone')}>
          <select className="input" value={values.timezone} onChange={setF('timezone')}>
            {TIMEZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </Field>
      </div>
      <FormActions onSave={() => onSave(values)} onCancel={reset} saving={saving} dirty={dirty} />
    </SectionCard>
  );
}

function AppearanceSection({ settings, onSave, saving, onDirtyChange }) {
  const { t } = useLanguage();
  const { setThemePref, setDensityPref } = useAppearance();
  const initial = useMemo(
    () => ({ theme: settings.theme || 'light', density: settings.density || 'comfortable' }),
    [settings]
  );
  const { values, patch, reset, dirty } = useDraft(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const themeOptions = [
    ['light', '☀️', t('settings.themeLight')],
    ['dark', '🌙', t('settings.themeDark')],
    ['system', '💻', t('settings.themeSystem')],
  ];
  const densityOptions = [
    ['comfortable', t('settings.densityComfortable')],
    ['compact', t('settings.densityCompact')],
  ];

  const selectOption = (k, v) => {
    if (k === 'theme') setThemePref(v);
    else setDensityPref(v);
    patch({ [k]: v });
  };

  const handleCancel = () => {
    reset();
    setThemePref(initial.theme);
    setDensityPref(initial.density);
  };

  return (
    <SectionCard emoji="🎨" title={t('settings.appearanceSettings')}>
      <p className="text-sm font-bold text-slate-800">{t('settings.theme')}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {themeOptions.map(([val, icon, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => selectOption('theme', val)}
            className={`rounded-xl border px-3 py-3 text-center text-sm transition ${
              values.theme === val
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className="block text-lg">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm font-bold text-slate-800">{t('settings.density')}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {densityOptions.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => selectOption('density', val)}
            className={`rounded-xl border px-3 py-2.5 text-sm transition ${
              values.density === val
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <FormActions
        onSave={() => onSave({ theme: values.theme, density: values.density })}
        onCancel={handleCancel}
        saving={saving}
        dirty={dirty}
      />
    </SectionCard>
  );
}

function SecuritySection({ onDirtyChange, navigate }) {
  const { t } = useLanguage();
  const { admin, updateToken } = useAuth();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => onDirtyChange(false), [onDirtyChange]);

  const handleLogoutAll = async () => {
    setLoggingOut(true);
    try {
      const { data } = await authApi.logoutAll();
      if (data?.token) updateToken(data.token);
      toast.success(t('settings.logoutAllDone'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SectionCard
      emoji="🔒"
      title={t('settings.securitySettings')}
      actions={[<Badge key="session">{t('settings.activeSession')}</Badge>]}
    >
      <p className="text-sm font-bold text-slate-800">{t('settings.accountInfo')}</p>
      <div className="mt-2 grid gap-3 rounded-xl border border-slate-100 p-4 sm:grid-cols-2">
        <Field label={t('profile.adminName')}>
          <input className="input" value={admin?.name || ''} readOnly />
        </Field>
        <Field label={t('profile.username')}>
          <input className="input" value={admin?.username || ''} readOnly />
        </Field>
        <Field label={t('profile.email')}>
          <input className="input" value={admin?.email || ''} readOnly />
        </Field>
        <Field label={t('profile.phone')}>
          <input className="input" value={admin?.phone || ''} readOnly />
        </Field>
      </div>

      <div className="mt-5 space-y-3">
        <button type="button" className="btn-secondary w-full" onClick={() => navigate('/profile')}>
          {t('settings.changePassword')}
        </button>
        <div className="rounded-xl border border-slate-100 p-3">
          <p className="text-sm font-semibold text-slate-700">{t('settings.logoutAllDevices')}</p>
          <p className="mt-0.5 text-xs text-slate-400">{t('settings.logoutAllHint')}</p>
          <button
            type="button"
            className="btn-danger mt-3 w-full"
            onClick={() => setConfirm(true)}
            disabled={loggingOut}
          >
            {loggingOut ? t('common.saving') : t('settings.logoutAllDevices')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={handleLogoutAll}
        title={t('settings.logoutAllDevices')}
        message={t('settings.logoutAllHint')}
        confirmText={t('common.delete')}
      />
    </SectionCard>
  );
}

function DataSection({ onDirtyChange }) {
  const toast = useToast();
  const { t } = useLanguage();
  const { data, loading, error, refetch } = useFetch(settingsApi.stats);
  const [exporting, setExporting] = useState(false);
  useEffect(() => onDirtyChange(false), [onDirtyChange]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await settingsApi.exportData();
      const blob = res.data;
      if (!blob || !(blob instanceof Blob)) throw new Error('bad response');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poultry-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('settings.exported'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const derived = data?.derived || { activeSets: 0, totalHens: 0, activeMortalityRecords: 0 };

  return (
    <SectionCard
      emoji="🗄️"
      title={t('settings.dataSettings')}
      actions={[
        <button key="export" className="btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? t('common.saving') : t('settings.exportData')}
        </button>,
      ]}
    >
      {error && <ErrorBox message={error} onRetry={() => refetch()} />}
      {loading && <LoadingBox label={t('settings.loading')} />}
      {!loading && !error && (
        <>
          <p className="text-sm font-bold text-slate-800">{t('settings.derivedStats')}</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              [num(derived.activeSets), t('poultrysets.title')],
              [num(derived.totalHens), t('settings.henAllocation')],
              [num(derived.activeMortalityRecords), t('deadhens.title')],
            ].map(([v, label], i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{v}</p>
                <p className="text-[11px] text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm font-bold text-slate-800">{t('settings.dataStatus')}</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t('common.name')}</th>
                  <th className="px-3 py-2 text-right">{t('settings.records')}</th>
                  <th className="px-3 py-2 text-right">{t('settings.active')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.counts || []).map((c) => (
                  <tr key={c.label} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-700">{c.label}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{num(c.total)}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{num(c.active)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            {t('settings.noDestructive')}
          </div>
        </>
      )}
    </SectionCard>
  );
}

function AboutSection({ settings, onDirtyChange }) {
  const { t } = useLanguage();
  useEffect(() => onDirtyChange(false), [onDirtyChange]);

  return (
    <SectionCard emoji="ℹ️" title={t('settings.appAbout')}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('settings.farmName')}>
          <input className="input" value={settings.farmName || ''} readOnly />
        </Field>
        <Field label={t('settings.appVersion')}>
          <input className="input" value="1.0.0" readOnly />
        </Field>
        <Field label={t('settings.techStack')}>
          <input className="input" value={t('settings.stackValue')} readOnly />
        </Field>
        <Field label={t('common.name')}>
          <input className="input" value="BALASUBRAMANI POULTRY" readOnly />
        </Field>
      </div>
      <div className="mt-4 space-y-1 text-sm text-slate-600">
        <p>{t('settings.farmName')}: {settings.farmName}</p>
        <p>{t('settings.location')}: {settings.location}</p>
        <p>{t('settings.phone')}: {settings.phone || '—'}</p>
        <p>{t('settings.email')}: {settings.email || '—'}</p>
      </div>
    </SectionCard>
  );
}