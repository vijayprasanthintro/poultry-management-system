import { useEffect, useState } from 'react';
import { feedUsageApi, setsApi, feedApi } from '../api';
import { getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/Spinner';
import { num, fmtDate, inr, todayInput } from '../utils/format';
import Field from '../components/Field';
import { useLanguage } from '../i18n/LanguageContext';

function emptyForm() {
  return { date: todayInput(), set: '', feedName: '', feed: '', pricePerKg: '', startingWeight: '', feedAdded: 0, feedUsed: '', endingWeight: '', unit: 'KG', isAdjustment: false, notes: '' };
}

export default function FeedUsage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [range, setRange] = useState('today');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [summary, setSummary] = useState(null);

  const { data: setsData, loading: setsLoading } = useFetch(setsApi.getAll);
  const { data: feedsData } = useFetch(feedApi.getAll);
  const { data, loading, error, refetch } = useFetch(feedUsageApi.getAll, { range }, { records: [] });

  useEffect(() => {
    refetch({ range });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    feedUsageApi
      .summary()
      .then(({ data: d }) => setSummary(d.summary))
      .catch(() => setSummary(null));
  }, [data]);

  useEffect(() => {
    if (editing) {
      setForm({
        date: editing.date ? editing.date.slice(0, 10) : todayInput(),
        set: editing.set?._id || editing.set || '',
        feedName: editing.feedName || '',
        feed: editing.feed?._id || editing.feed || '',
        pricePerKg: editing.pricePerKg ?? '',
        startingWeight: editing.startingWeight ?? '',
        feedAdded: editing.feedAdded ?? 0,
        feedUsed: editing.feedUsed ?? '',
        endingWeight: editing.endingWeight ?? '',
        unit: editing.unit || 'KG',
        isAdjustment: editing.isAdjustment || false,
        notes: editing.notes || '',
      });
    }
  }, [editing]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.set) {
      toast.error(t('feedusage.validationSet'));
      return;
    }
    if (form.feedUsed === '' || Number(form.feedUsed) < 0) {
      toast.error(t('feedusage.validationUsed'));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await feedUsageApi.update(editing._id, form);
        toast.success(t('feedusage.updated'));
      } else {
        await feedUsageApi.create(form);
        toast.success(t('feedusage.created'));
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, t('feedusage.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await feedUsageApi.remove(record._id);
      toast.success(t('feedusage.deleted'));
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'date', header: t('feedusage.date'), render: (r) => fmtDate(r.date) },
    { key: 'set', header: t('eggs.set'), render: (r) => <span className="font-semibold">{r.set?.name || '-'}</span> },
    { key: 'feedName', header: t('feed.feedName'), render: (r) => r.feedName || '-' },
    { key: 'startingWeight', header: t('reports.startKg'), render: (r) => num(r.startingWeight) },
    { key: 'feedAdded', header: t('reports.addedKg'), render: (r) => <span className="text-emerald-600">+{num(r.feedAdded)}</span> },
    { key: 'feedUsed', header: t('feedusage.usedKg'), render: (r) => <span className="font-bold text-slate-900">{num(r.feedUsed)}</span> },
    { key: 'endingWeight', header: t('reports.endKg'), render: (r) => num(r.endingWeight) },
    { key: 'feedCost', header: t('feed.cost'), render: (r) => <span className="font-semibold">{inr(r.feedCost)}</span> },
    {
      key: 'isAdjustment',
      header: t('feedusage.adjustmentLabel'),
      render: (r) => (r.isAdjustment ? <span className="badge bg-sky-100 text-sky-700">{t('feedusage.adjustmentLabel')}</span> : <span className="badge bg-emerald-100 text-emerald-700">{t('feedusage.usageLabel')}</span>),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('feedusage.title')}
        subtitle={t('feedusage.formula')}
        actions={[
          <button key="add" className="btn-primary" onClick={() => { setEditing(null); setForm(emptyForm()); setModalOpen(true); }}>
            <Icon name="plus" className="h-4 w-4" /> {t('feedusage.recordUsage')}
          </button>,
        ]}
      />

      {summary && (
        <div className={`mb-4 rounded-xl border p-4 ${summary.lowStock ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('feedusage.usedToday')}</p>
              <p className="text-2xl font-bold text-slate-900">{num(summary.usedToday, 2)} kg</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('feed.available')}</p>
              <p className="text-2xl font-bold text-emerald-600">{num(summary.availableKg, 2)} kg</p>
            </div>
            {summary.lowStock && (
              <div className="rounded-lg bg-white border border-red-200 px-3 py-1.5 self-center">
                <p className="text-sm font-bold text-red-600">{`${t('feedusage.lowStockTitle')} ⚠ (min ${num(summary.minimumStock)} kg)`}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="today">{t('common.today')}</option>
          <option value="7">{t('common.last7')}</option>
          <option value="30">{t('common.last30')}</option>
          <option value="month">{t('common.month')}</option>
          <option value="year">{t('common.year')}</option>
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : (data?.records || [])}
        loading={loading}
        emptyTitle={t('feedusage.noRecords')}
        emptyHint={t('feedusage.noRecordsHint')}
        actions={(record) => (
          <>
            <button className="btn-ghost !px-2" onClick={() => { setEditing(record); setModalOpen(true); }} title={t('common.edit')}>
              <Icon name="edit" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 !text-red-600" onClick={() => setConfirm(record)} title={t('common.delete')}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('feedusage.editTitle') : t('feedusage.createTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('feedusage.date')}>
              <input className="input" type="date" value={form.date} onChange={setField('date')} />
            </Field>
            <Field label={t('feedusage.setLabel')}>
              <select className="input" value={form.set} onChange={setField('set')} required>
                <option value="">{t('feedusage.selectSet')}</option>
                {!(setsLoading) && (setsData?.sets || []).map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('feedusage.feedOptional')}>
              <select className="input" value={form.feed} onChange={(e) => {
                const val = e.target.value;
                const feed = (feedsData?.feeds || []).find((f) => f._id === val);
                setForm((f) => ({
                  ...f,
                  feed: val,
                  feedName: feed?.name || f.feedName,
                  pricePerKg: feed?.pricePerKg != null ? feed.pricePerKg : f.pricePerKg,
                }));
              }}>
                <option value="">{t('feedusage.general')}</option>
                {(feedsData?.feeds || []).map((fd) => (
                  <option key={fd._id} value={fd._id}>{fd.name} (₹{fd.pricePerKg}/kg)</option>
                ))}
              </select>
            </Field>
            <Field label={t('feed.feedName')}>
              <input className="input" value={form.feedName} onChange={setField('feedName')} placeholder="e.g. Layer Mash A" />
            </Field>
            <Field label={t('feedusage.startingWeight')}>
              <input className="input" type="number" step="0.5" min="0" value={form.startingWeight} onChange={setField('startingWeight')} placeholder={t('feedusage.startWeightHint')} />
            </Field>
            <Field label={t('feedusage.feedAdded')}>
              <input className="input" type="number" step="0.5" min="0" value={form.feedAdded} onChange={setField('feedAdded')} placeholder="0" />
            </Field>
            <Field label={t('feedusage.usedLabel')}>
              <input className="input" type="number" step="0.5" min="0" value={form.feedUsed} onChange={setField('feedUsed')} placeholder="e.g. 120" required />
            </Field>
            <Field label={t('feedusage.pricePerKgLabel')} hint={t('feedusage.priceHint')}>
              <input className="input" type="number" step="0.01" min="0" value={form.pricePerKg} onChange={setField('pricePerKg')} placeholder="e.g. 32.50" />
            </Field>
            <Field label={t('feed.unit')}>
              <select className="input" value={form.unit} onChange={setField('unit')}>
                <option value="KG">KG</option>
                <option value="GRAMS">GRAMS</option>
              </select>
            </Field>
            <Field label={t('feedusage.adjustmentField')}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={form.isAdjustment} onChange={(e) => setForm((f) => ({ ...f, isAdjustment: e.target.checked }))} />
                <span className="text-slate-600">{t('feedusage.bypassLowStock')}</span>
              </label>
            </Field>
          </div>
          <Field label={t('feedusage.endingLabel')}>
            <input className="input" type="number" step="0.5" min="0" value={form.endingWeight} onChange={setField('endingWeight')} placeholder={t('feedusage.endingHint')} />
          </Field>
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
        title={t('feedusage.deleteTitle')}
        message={t('feedusage.deleteMsg')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}