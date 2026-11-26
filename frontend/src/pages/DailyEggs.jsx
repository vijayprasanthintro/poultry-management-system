import { useEffect, useState } from 'react';
import { eggsApi, setsApi } from '../api';
import { getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/Spinner';
import { num, fmtDate, todayInput } from '../utils/format';
import Field from '../components/Field';

const calcEggs = (f) => {
  const single = Number(f.singleEggs) || 0;
  const dbl = Number(f.doubleEggs) || 0;
  const broken = Number(f.brokenEggs) || 0;
  const rejected = Number(f.rejectedEggs) || 0;
  return {
    single,
    dbl,
    broken,
    rejected,
    total: single + dbl + broken + rejected,
    sellable: single + dbl,
  };
};

function emptyForm(setId = '') {
  return {
    set: setId,
    date: todayInput(),
    birds: '',
    singleEggs: 0,
    doubleEggs: 0,
    brokenEggs: 0,
    rejectedEggs: 0,
    notes: '',
  };
}

export default function DailyEggs() {
  const toast = useToast();
  const { t } = useLanguage();
  const [setFilter, setSetFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(todayInput());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [summary, setSummary] = useState(null);

  const { data: setsData, loading: setsLoading } = useFetch(setsApi.getAll);
  const { data, loading, error, refetch } = useFetch(
    eggsApi.getAll,
    { from: dateFilter, to: dateFilter, set: setFilter },
    { records: [] }
  );

  useEffect(() => {
    refetch({ from: dateFilter, to: dateFilter, set: setFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFilter, dateFilter]);

  useEffect(() => {
    eggsApi
      .todaySummary()
      .then(({ data: d }) => setSummary(d.summary))
      .catch(() => setSummary(null));
  }, [data]);

  useEffect(() => {
    if (editing) {
      setForm({
        set: editing.set?._id || editing.set || '',
        date: editing.date ? editing.date.slice(0, 10) : todayInput(),
        birds: editing.birds ?? '',
        singleEggs: editing.singleEggs ?? (Number(editing.totalEggs) - (Number(editing.brokenEggs) || 0) - (Number(editing.rejectedEggs) || 0)),
        doubleEggs: editing.doubleEggs || 0,
        brokenEggs: editing.brokenEggs || 0,
        rejectedEggs: editing.rejectedEggs || 0,
        notes: editing.notes || '',
      });
    }
  }, [editing]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(setFilter || ''));
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setModalOpen(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    const calc = calcEggs(form);
    if (!form.set || !form.date) {
      toast.error(t('eggs.selectSet'));
      return;
    }
    const counts = ['singleEggs', 'doubleEggs', 'brokenEggs', 'rejectedEggs'];
    if (counts.some((key) => form[key] !== '' && Number(form[key]) < 0)) {
      toast.error(t('eggs.validation'));
      return;
    }
    if (calc.total <= 0) {
      toast.error(t('eggs.validation'));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await eggsApi.update(editing._id, form);
        toast.success(t('eggs.updated'));
      } else {
        await eggsApi.create(form);
        toast.success(t('eggs.created'));
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, t('eggs.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await eggsApi.remove(record._id);
      toast.success(t('eggs.deleted'));
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
    { key: 'set', header: t('eggs.set'), render: (r) => <span className="font-semibold">{r.set?.name || '-'}</span> },
    { key: 'birds', header: t('eggs.birds'), render: (r) => num(r.birds) },
    { key: 'singleEggs', header: t('eggs.single'), render: (r) => num(r.singleEggs ?? Number(r.totalEggs) - (Number(r.brokenEggs) || 0) - (Number(r.rejectedEggs) || 0)) },
    { key: 'doubleEggs', header: t('eggs.double'), render: (r) => <span className="text-violet-600">{num(r.doubleEggs)}</span> },
    { key: 'totalEggs', header: t('eggs.totalEggs'), render: (r) => <span className="font-bold">{num(r.totalEggs)}</span> },
    { key: 'brokenEggs', header: t('eggs.broken'), render: (r) => <span className="text-red-600">{num(r.brokenEggs)}</span> },
    { key: 'rejectedEggs', header: t('eggs.rejected'), render: (r) => <span className="text-amber-600">{num(r.rejectedEggs)}</span> },
    { key: 'sellableEggs', header: t('eggs.sellable'), render: (r) => <span className="font-bold text-emerald-600">{num(r.sellableEggs)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title={t('eggs.title')}
        subtitle={t('eggs.subtitle')}
        actions={[
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('eggs.enterEggs')}
          </button>,
        ]}
      />

      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryBox label={t('eggs.todaysProduction')} value={num(summary?.production || 0)} />
        <SummaryBox label={t('eggs.single')} value={num(summary?.single || 0)} />
        <SummaryBox label={t('eggs.double')} value={num(summary?.dbl || 0)} />
        <SummaryBox label={t('eggs.broken')} value={num(summary?.broken || 0)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <label className="label mb-0">{t('eggs.dateLabel')}</label>
        <input type="date" className="input !w-auto" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        <label className="label mb-0 ml-2">{t('eggs.setLabel')}</label>
        <select className="input !w-auto" value={setFilter} onChange={(e) => setSetFilter(e.target.value)}>
          <option value="">{t('eggs.allSets')}</option>
          {!setsLoading && (setsData?.sets || []).map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : (data?.records || [])}
        loading={loading}
        emptyTitle={t('eggs.noRecords')}
        emptyHint={t('eggs.noRecordsHint')}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('eggs.editTitle') : t('eggs.createTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('eggs.poultrySet')}>
              <select className="input" value={form.set} onChange={setField('set')} required>
                <option value="">{t('eggs.selectSet')}</option>
                {!setsLoading && (setsData?.sets || []).map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('common.date')}>
              <input className="input" type="date" value={form.date} onChange={setField('date')} />
            </Field>
            <Field label={t('eggs.autoFromSet')}>
              <input className="input" type="number" min="0" value={form.birds} onChange={setField('birds')} placeholder={t('common.auto')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label={t('eggs.singleRequired')}>
              <input className="input" type="number" min="0" value={form.singleEggs} onChange={setField('singleEggs')} required />
            </Field>
            <Field label={t('eggs.doubleOptional')}>
              <input className="input" type="number" min="0" value={form.doubleEggs} onChange={setField('doubleEggs')} />
            </Field>
            <Field label={t('eggs.brokenOptional')}>
              <input className="input" type="number" min="0" value={form.brokenEggs} onChange={setField('brokenEggs')} />
            </Field>
            <Field label={t('eggs.rejectedOptional')}>
              <input className="input" type="number" min="0" value={form.rejectedEggs} onChange={setField('rejectedEggs')} />
            </Field>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald-800">
              <span className="font-bold">{t('eggs.totalEggs')}:</span> {num(calcEggs(form).total)} ·{' '}
              <span className="font-bold">{t('eggs.sellable')}:</span> {num(calcEggs(form).sellable)}
            </p>
            <p className="mt-0.5 text-xs text-emerald-600">{t('eggs.formulaHint')}</p>
          </div>

          <Field label={t('common.notes')}>
            <textarea className="input" rows="2" value={form.notes} onChange={setField('notes')} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title={t('eggs.deleteTitle')}
        message={t('eggs.deleteMsg')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}