import { useEffect, useState } from 'react';
import { deadHenApi, setsApi } from '../api';
import { getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/Spinner';
import { num, fmtDate, todayInput } from '../utils/format';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function emptyForm(setId = '') {
  return { set: setId, date: todayInput(), deadHens: '', reason: '', notes: '' };
}

export default function DeadHenMortality() {
  const toast = useToast();
  const { t } = useLanguage();
  const { settings } = useSettings();

  const reasonOptions = (settings.mortalityReasons || [])
    .filter((r) => r.enabled !== false && r.label && r.label.trim())
    .map((r) => r.label.trim());

  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [setFilter, setSetFilter] = useState('');

  const { data: setsData, loading: setsLoading, error: setsError } = useFetch(setsApi.getAll, {}, { sets: [] });
  const sets = setsData?.sets || [];

  const { data, loading, error, refetch } = useFetch(deadHenApi.getAll, { set: setFilter || undefined }, { records: [] });
  const {
    data: stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = useFetch(deadHenApi.dashboardStats, {}, null);

  // Refetch records when the set filter changes.
  useEffect(() => {
    refetch({ set: setFilter || undefined });
  }, [setFilter]);

  // Prefill the form's set (and default reason) once sets are loaded.
  useEffect(() => {
    if (!form.set && !editing && sets.length > 0) {
      setForm((f) => ({
        ...f,
        set: setFilter || sets[0]._id,
        reason: f.reason || settings.defaultMortalityReason || '',
      }));
    }
  }, [sets, setFilter, editing, form.set, settings.defaultMortalityReason]);

  // Keep the form in sync when editing a record.
  useEffect(() => {
    if (editing) {
      setForm({
        set: editing.set?._id || editing.set || '',
        date: editing.date ? editing.date.slice(0, 10) : todayInput(),
        deadHens: editing.deadHens ?? '',
        reason: editing.reason || '',
        notes: editing.notes || '',
      });
    }
  }, [editing]);

  const refreshAll = () => {
    refetch({ set: setFilter || undefined });
    refetchStats();
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const scrollToForm = () => {
    document.getElementById('mortality-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(setFilter));
    scrollToForm();
  };

  const openEdit = (record) => {
    setEditing(record);
    scrollToForm();
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm(setFilter));
  };

  const selectedSetStats = stats?.sets?.find((s) => String(s.setId) === String(form.set));
  const setLiveNow = selectedSetStats != null ? Number(selectedSetStats.liveHens) : null;
  const editingSameSet =
    editing && String(editing.set?._id || editing.set) === String(form.set);
  const availableForForm = setLiveNow != null ? (editingSameSet ? setLiveNow + Number(editing.deadHens || 0) : setLiveNow) : null;
  const filteredSetLive =
    setFilter && stats ? (stats.sets || []).find((x) => String(x.setId) === String(setFilter))?.liveHens : null;

  const validate = () => {
    if (!form.set) {
      toast.error(t('deadhens.validationSet'));
      return false;
    }
    if (!form.date) {
      toast.error(t('deadhens.validationDate'));
      return false;
    }
    const value = Number(form.deadHens);
    if (!form.deadHens || !Number.isInteger(value) || value <= 0) {
      toast.error(t('deadhens.validationPositiveInteger'));
      return false;
    }
    if (availableForForm != null && value > availableForForm) {
      toast.error(t('deadhens.validationLive', { available: num(availableForForm) }));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await deadHenApi.update(editing._id, form);
        toast.success(t('deadhens.updated'));
      } else {
        await deadHenApi.create(form);
        toast.success(t('deadhens.created'));
      }
      cancelEdit();
      refreshAll();
    } catch (err) {
      toast.error(getErrorMessage(err, t('deadhens.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await deadHenApi.remove(record._id);
      toast.success(t('deadhens.deleted'));
      refreshAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    {
      key: 'set',
      header: t('deadhens.set'),
      render: (r) =>
        r.set?.name ? (
          <span className="font-semibold text-slate-700">{r.set.name}</span>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    { key: 'date', header: t('common.date'), render: (r) => <span className="font-semibold">{fmtDate(r.date)}</span> },
    {
      key: 'deadHens',
      header: t('deadhens.deadHens'),
      render: (r) => <span className="font-bold text-red-600">{num(r.deadHens)}</span>,
    },
    { key: 'reason', header: t('common.reason'), render: (r) => (r.reason ? <span className="text-slate-700">{r.reason}</span> : <span className="text-slate-400">-</span>) },
    { key: 'notes', header: t('common.notes'), render: (r) => (r.notes ? <span className="text-slate-600">{r.notes}</span> : <span className="text-slate-400">-</span>) },
  ];

  return (
    <div>
      <PageHeader
        title={t('deadhens.title')}
        subtitle={t('deadhens.subtitle')}
        actions={[
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('deadhens.addRecord')}
          </button>,
        ]}
      />

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard loading={statsLoading} label={t('dashboard.totalHens')} value={num(stats?.totalHens)} icon={<span className="text-lg">🐔</span>} accent="blue" />
        <StatCard loading={statsLoading} label={t('dashboard.totalDeadHens')} value={num(stats?.totalDeadHens)} icon={<span className="text-lg">💀</span>} accent="red" />
        <StatCard loading={statsLoading} label={t('dashboard.liveHens')} value={num(stats?.liveHens)} icon={<span className="text-lg">🐔</span>} accent="green" />
        <StatCard loading={statsLoading} label={t('dashboard.todayDeadHens')} value={num(stats?.todayDeadHens)} icon={<span className="text-lg">📅</span>} accent="amber" />
      </div>

      {/* Per-set summary */}
      {!statsLoading && stats?.sets?.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-600">
            {t('deadhens.perSetTitle')}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.sets.map((s) => (
              <div key={String(s.setId)} className="card p-3">
                <p className="text-[11px] font-bold text-slate-800">{s.name}</p>
                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
                  <span className="text-slate-500">{t('dashboard.totalHens')}</span>
                  <span className="font-semibold text-right">{num(s.totalHens)}</span>
                  <span className="text-slate-500">{t('dashboard.totalDeadHens')}</span>
                  <span className="font-semibold text-right text-red-600">{num(s.totalDeadHens)}</span>
                  <span className="text-slate-500">{t('dashboard.liveHens')}</span>
                  <span className="font-semibold text-right text-emerald-600">{num(s.liveHens)}</span>
                  <span className="text-slate-500">{t('dashboard.todayDeadHens')}</span>
                  <span className="font-semibold text-right text-sky-600">{num(s.todayDeadHens)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-day mortality chart */}
      {!statsLoading && stats?.deathTrend?.length > 0 && (
        <div className="mt-4 card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Icon name="chart" className="h-4 w-4 text-brand-600" /> {t('deadhens.mortalityChart')}
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.deathTrend.map((d) => ({ date: d.date.slice(5), deadHens: Number(d.deadHens) || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="deadHens" name={t('deadhens.deadHens')} fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add / Edit form */}
      <div id="mortality-form" className="mt-4 card p-4 scroll-mt-24">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          {editing ? t('deadhens.editTitle') : t('deadhens.createTitle')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label={t('deadhens.setLabel')}>
              <select className="input" value={form.set} onChange={setField('set')} required disabled={setsLoading}>
                <option value="">{t('deadhens.selectSet')}</option>
                {sets.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('common.date')}>
              <input className="input" type="date" value={form.date} onChange={setField('date')} required />
            </Field>
            <Field label={t('deadhens.deadHens')}>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={form.deadHens}
                onChange={setField('deadHens')}
                placeholder="0"
                required
              />
            </Field>
            <div className="flex gap-2 justify-end items-end">
              {editing && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  {t('common.cancel')}
                </button>
              )}
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? t('common.saving') : editing ? t('common.save') : t('deadhens.addRecord')}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label={t('deadhens.reasonOptional')}>
              <select
                className="input"
                value={form.reason && reasonOptions.includes(form.reason) ? form.reason : 'custom'}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              >
                <option value="">—</option>
                {reasonOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="custom">{t('common.other')}</option>
              </select>
              {(!form.reason || !reasonOptions.includes(form.reason)) && (
                <input
                  className="input mt-2"
                  type="text"
                  value={form.reason === 'custom' ? '' : form.reason}
                  onChange={setField('reason')}
                  placeholder={t('deadhens.reasonPlaceholder')}
                />
              )}
            </Field>
            <Field label={t('common.notes')}>
              <input className="input" type="text" value={form.notes} onChange={setField('notes')} placeholder={t('deadhens.notesPlaceholder')} />
            </Field>
          </div>
        </form>
        {availableForForm != null && (
          <p className="mt-3 text-xs text-slate-500">
            {editingSameSet
              ? t('deadhens.maxAllowed', { available: num(availableForForm) })
              : t('deadhens.availableLive', { available: num(availableForForm) })}
          </p>
        )}
      </div>

      {error && <ErrorBox message={error} onRetry={() => refreshAll()} />}

      <div className="mt-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <Icon name="chart" className="h-4 w-4 text-brand-600" /> {t('deadhens.recentMortality')}
        </h3>
        <div className="mb-3 flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">{t('deadhens.set')}</label>
          <select
            className="input !w-52"
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
          >
            <option value="">{t('deadhens.allSets')}</option>
            {sets.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          {filteredSetLive != null && (
            <span className="text-xs font-semibold text-emerald-600">
              {t('deadhens.availableLive', { available: num(filteredSetLive) })}
            </span>
          )}
          {setsError && <span className="text-xs text-red-500">{setsError}</span>}
        </div>
        <DataTable
          columns={columns}
          rows={loading ? [] : (data?.records || [])}
          loading={loading}
          emptyTitle={t('deadhens.noRecords')}
          emptyHint={t('deadhens.noRecordsHint')}
          actions={(record) => (
            <>
              <button className="btn-ghost !px-2" onClick={() => openEdit(record)} title={t('common.edit')}>
                <Icon name="edit" className="h-4 w-4" />
              </button>
              <button className="btn-ghost !px-2 !text-red-600" onClick={() => setConfirm(record)} title={t('common.delete')}>
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </>
          )}
        />
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title={t('deadhens.deleteTitle')}
        message={t('deadhens.deleteMsg')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}