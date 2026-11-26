import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { labourExpensesApi, laboursApi } from '../api';
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
import { num, inr, fmtDate, todayInput } from '../utils/format';
import Field from '../components/Field';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

const LABOUR_CATEGORIES = ['Food', 'Market', 'Travel', 'Bus', 'Medicine', 'Other'];
const PIE_COLORS = ['#f97316', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

function emptyForm() {
  return { labour: '', category: 'Food', purpose: '', amount: '', date: todayInput(), notes: '' };
}

export default function LabourExpenses() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mode, setMode] = useState('individual');
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const { data, loading, error, refetch, params, setParams } = useFetch(
    labourExpensesApi.getAll,
    { range: '30' },
    { expenses: [], summary: {} }
  );
  const { data: laboursData } = useFetch(laboursApi.getAll, { active: 'true' }, { labours: [] });

  const activeRange = params.range || '30';
  const activeLabour = params.labour || '';
  const activeCategory = params.category || '';
  const updateFilter = (key) => (e) => setParams((p) => ({ ...p, [key]: e.target.value }));

  const labours = laboursData?.labours || [];
  const expenses = data?.expenses || [];
  const summary = data?.summary || { byCategory: [] };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setMode('individual');
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openCommon = () => {
    setMode('common');
    setEditing(null);
    setForm({ ...emptyForm(), labour: '' });
    setModalOpen(true);
  };

  const openEdit = (rec) => {
    setMode('individual');
    setEditing(rec);
    setForm({
      labour: rec.labour?._id || rec.labour || '',
      category: rec.category || 'Other',
      purpose: rec.purpose || '',
      amount: rec.amount || '',
      date: rec.date ? rec.date.slice(0, 10) : todayInput(),
      notes: rec.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (mode === 'common') {
      if (!form.purpose.trim()) { toast.error(t('labexp.validationPurpose')); return; }
      if (!form.amount || Number(form.amount) <= 0) { toast.error(t('labexp.validationAmount')); return; }
      if (!labours.length) { toast.error(t('labexp.noActiveLabours')); return; }
      setSaving(true);
      try {
        const { data: res } = await labourExpensesApi.createCommon({
          total: form.amount, category: form.category, purpose: form.purpose, date: form.date, notes: form.notes,
        });
        toast.success(t('labexp.commonCreated', { count: res.count }));
        setModalOpen(false);
        refetch();
      } catch (err) { toast.error(getErrorMessage(err)); } finally { setSaving(false); }
      return;
    }
    if (!form.labour) { toast.error(t('labexp.validationLabour')); return; }
    if (!form.purpose.trim()) { toast.error(t('labexp.validationPurpose')); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error(t('labexp.validationAmount')); return; }
    setSaving(true);
    try {
      if (editing) { await labourExpensesApi.update(editing._id, form); toast.success(t('labexp.updated')); }
      else { await labourExpensesApi.create(form); toast.success(t('labexp.created')); }
      setModalOpen(false);
      refetch();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setSaving(false); }
  };

  const handleDelete = async (rec) => {
    try {
      if (rec.source === 'common' && rec.commonGroup) {
        await labourExpensesApi.deleteGroup(rec.commonGroup);
        toast.success(t('labexp.commonDeleted'));
      } else {
        await labourExpensesApi.remove(rec._id);
        toast.success(t('labexp.deleted'));
      }
      refetch();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const byCat = summary.byCategory || [];
  const catChart = byCat.map((c) => ({ name: t('labexp.categories.' + (c.category || 'Other')), value: c.amount }));

  const byLab = {};
  expenses.forEach((e) => {
    const name = e.labour?.name || '—';
    byLab[name] = (byLab[name] || 0) + e.amount;
  });
  const labChart = Object.entries(byLab).map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));

  const columns = [
    { key: 'date', header: t('labexp.date'), render: (r) => fmtDate(r.date) },
    {
      key: 'labour', header: t('labexp.labour'),
      render: (r) => (
        <button className="text-orange-600 font-semibold hover:underline" onClick={() => navigate('/labours/' + (r.labour?._id || ''))}>
          {r.labour?.name || '—'}
        </button>
      ),
    },
    { key: 'category', header: t('labexp.category'), render: (r) => <span className="badge bg-indigo-100 text-indigo-700">{t('labexp.categories.' + (r.category || 'Other'))}</span> },
    { key: 'purpose', header: t('labexp.purpose'), render: (r) => (
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1"><Icon name="share" className="h-3.5 w-3.5 text-teal-600" /> {r.purpose || '-'}</span>
        {r.source === 'common' && r.commonGroup && <span className="badge bg-teal-50 text-teal-700">{t('labexp.commonBadge')}</span>}
      </div>
    ) },
    { key: 'amount', header: t('common.amount'), render: (r) => <span className="font-bold text-red-600">{inr(r.amount)}</span> },
    { key: 'notes', header: t('common.notes'), render: (r) => r.notes || '-' },
  ];

  return (
    <div>
      <PageHeader
        title={t('labexp.title')}
        subtitle={t('labexp.subtitle')}
        actions={[
          <button key="common" className="btn-secondary" onClick={openCommon}>
            <Icon name="share" className="h-4 w-4" /> {t('labexp.addCommon')}
          </button>,
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('labexp.addExpense')}
          </button>,
        ]}
      />

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('labexp.totalExpense')}</p>
          <p className="mt-0.5 text-xl font-bold text-red-600">{inr(summary.totalExpense || 0)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('labexp.totalTransactions')}</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">{num(summary.transactionCount || 0)}</p>
        </div>
        <div className="card p-3 col-span-2 md:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('labexp.breakdownByLabour')}</p>
          <p className="mt-0.5 text-xl font-bold text-orange-600">{num(Object.keys(byLab).length)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {catChart.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-2">{t('labexp.breakdownByCategory')}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={catChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e) => e.name}>
                  {catChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {labChart.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-2">{t('labexp.breakdownByLabour')}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={labChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, t('common.amount')]} />
                <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <label className="label mb-0">{t('expenses.period')}</label>
        <select className="input !w-auto" value={activeRange} onChange={updateFilter('range')}>
          <option value="today">{t('common.today')}</option>
          <option value="7">{t('common.last7')}</option>
          <option value="30">{t('common.last30')}</option>
          <option value="month">{t('common.month')}</option>
          <option value="year">{t('common.year')}</option>
        </select>
        <label className="label mb-0 ml-2">{t('labexp.labour')}:</label>
        <select className="input !w-auto" value={activeLabour} onChange={updateFilter('labour')}>
          <option value="">{t('common.all')}</option>
          {labours.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
        <label className="label mb-0 ml-2">{t('labexp.category')}:</label>
        <select className="input !w-auto" value={activeCategory} onChange={updateFilter('category')}>
          <option value="">{t('common.all')}</option>
          {LABOUR_CATEGORIES.map((c) => <option key={c} value={c}>{t('labexp.categories.' + c)}</option>)}
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : expenses}
        loading={loading}
        emptyTitle={t('labexp.noRecords')}
        emptyHint={t('labexp.noRecordsHint')}
        actions={(record) => (
          <>
            {record.source !== 'common' && (
              <button className="btn-ghost !px-2" onClick={() => openEdit(record)} title={t('common.edit')}>
                <Icon name="edit" className="h-4 w-4" />
              </button>
            )}
            <button className="btn-ghost !px-2 !text-red-600" onClick={() => setConfirm(record)} title={t('common.delete')}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={mode === 'common' ? t('labexp.commonTitle') : editing ? t('labexp.editTitle') : t('labexp.createTitle')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {mode === 'common' && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-800">
              <p className="flex items-center gap-1.5 font-semibold"><Icon name="share" className="h-4 w-4" /> {t('labexp.commonHintTitle')}</p>
              <p className="mt-1">{t('labexp.commonHint')}</p>
              <p className="mt-1.5 font-bold">
                {labours.length
                  ? t('labexp.commonShare', { count: labours.length, share: inr((Number(form.amount) || 0) / labours.length) })
                  : t('labexp.noActiveLabours')}
              </p>
            </div>
          )}
          {mode !== 'common' && (
            <Field label={`${t('labexp.labour')} *`}>
              <select className="input" value={form.labour} onChange={setField('labour')} required>
                <option value="">{t('labexp.selectLabour')}</option>
                {labours.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('labexp.category')}>
              <select className="input" value={form.category} onChange={setField('category')}>
                {LABOUR_CATEGORIES.map((c) => <option key={c} value={c}>{t('labexp.categories.' + c)}</option>)}
              </select>
            </Field>
            <Field label={`${t('labexp.amount')} (₹) *`}>
              <input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={setField('amount')} required />
            </Field>
          </div>
          <Field label={`${t('labexp.purpose')} *`}>
            <input className="input" value={form.purpose} onChange={setField('purpose')} required />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('common.date')}>
              <input className="input" type="date" value={form.date} onChange={setField('date')} />
            </Field>
            <Field label={t('labexp.notesOptional')}>
              <input className="input" value={form.notes} onChange={setField('notes')} />
            </Field>
          </div>
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
        title={confirm?.source === 'common' ? t('labexp.commonDeleteTitle') : t('labexp.deleteTitle')}
        message={confirm?.source === 'common' ? t('labexp.commonDeleteMsg') : t('labexp.deleteMsg')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}