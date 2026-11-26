import { useState } from 'react';
import { expensesApi, setsApi } from '../api';
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
import { num, fmtDate, inr, todayInput } from '../utils/format';
import Field from '../components/Field';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const CATEGORIES = ['Feed', 'Medicine', 'Vaccination', 'Labour', 'Electricity', 'Transportation', 'Maintenance', 'Equipment', 'Other'];

function emptyForm() {
  return { date: todayInput(), category: 'Other', description: '', amount: '', set: '', supplier: '', notes: '' };
}

export default function Expenses() {
  const toast = useToast();
  const { t } = useLanguage();
  const [range, setRange] = useState('30');
  const [catFilter, setCatFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const { data: setsData, loading: setsLoading } = useFetch(setsApi.getAll);
  const { data, loading, error, refetch } = useFetch(
    expensesApi.getAll,
    { range, category: catFilter },
    { expenses: [] }
  );

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setForm({
      date: record.date ? record.date.slice(0, 10) : todayInput(),
      category: record.category,
      description: record.description || '',
      amount: record.amount || '',
      set: record.set?._id || record.set || '',
      supplier: record.supplier || '',
      notes: record.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.category) {
      toast.error(t('expenses.validationCategory'));
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error(t('expenses.validationAmount'));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await expensesApi.update(editing._id, form);
        toast.success(t('expenses.updated'));
      } else {
        await expensesApi.create(form);
        toast.success(t('expenses.created'));
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await expensesApi.remove(record._id);
      toast.success(t('expenses.deleted'));
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const expenses = data?.expenses || [];
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = {};
  expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });
  const chartData = Object.entries(byCategory).map(([k, v]) => ({ category: k, amount: Math.round(v * 100) / 100 }));

  const columns = [
    { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
    { key: 'category', header: t('common.category'), render: (r) => <span className="badge bg-orange-100 text-orange-700">{t('expcat.' + (r.category || 'Other'))}</span> },
    { key: 'description', header: t('expenses.description'), render: (r) => r.description || '-' },
    { key: 'set', header: t('eggs.set'), render: (r) => r.set?.name || '-' },
    { key: 'amount', header: t('common.amount'), render: (r) => <span className="font-bold">{inr(r.amount)}</span> },
    { key: 'supplier', header: t('expenses.supplier'), render: (r) => r.supplier || '-' },
    { key: 'notes', header: t('common.notes'), render: (r) => r.notes || '-' },
  ];

  return (
    <div>
      <PageHeader
        title={t('expenses.title')}
        subtitle={t('expenses.subtitle')}
        actions={[
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('expenses.addExpense')}
          </button>,
        ]}
      />

      <div className="mb-4 card p-4 flex flex-wrap gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('expenses.totalExpens')}</p>
          <p className="text-2xl font-bold text-red-600">{inr(total)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('expenses.count')}</p>
          <p className="text-2xl font-bold text-slate-900">{num(expenses.length)}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2">{t('expenses.byCategory')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, t('common.amount')]} />
              <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <label className="label mb-0">{t('expenses.period')}</label>
        <select
          className="input !w-auto"
          value={range}
          onChange={(e) => {
            setRange(e.target.value);
            refetch({ range: e.target.value });
          }}
        >
          <option value="today">{t('common.today')}</option>
          <option value="7">{t('common.last7')}</option>
          <option value="30">{t('common.last30')}</option>
          <option value="month">{t('common.month')}</option>
          <option value="year">{t('common.year')}</option>
        </select>
        <label className="label mb-0 ml-2">{t('common.category')}:</label>
        <select
          className="input !w-auto"
          value={catFilter}
          onChange={(e) => {
            setCatFilter(e.target.value);
            refetch({ category: e.target.value });
          }}
        >
          <option value="">{t('expenses.allCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t('expcat.' + c)}</option>
          ))}
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : expenses}
        loading={loading}
        emptyTitle={t('expenses.noRecords')}
        emptyHint={t('expenses.noRecordsHint')}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('expenses.editTitle') : t('expenses.createTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('common.date')}>
              <input className="input" type="date" value={form.date} onChange={setField('date')} />
            </Field>
            <Field label={`${t('common.category')} *`}>
              <select className="input" value={form.category} onChange={setField('category')} required>
                <option value="">{t('expenses.selectCategory')}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t('expcat.' + c)}</option>
                ))}
              </select>
            </Field>
            <Field label={`${t('common.amount')} (₹) *`}>
              <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={setField('amount')} placeholder="e.g. 500" required />
            </Field>
            <Field label={t('expenses.setOptional')}>
              <select className="input" value={form.set} onChange={setField('set')}>
                <option value="">{t('expenses.notSetSpecific')}</option>
                {!setsLoading && (setsData?.sets || []).map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('expenses.description')}>
              <input className="input" value={form.description} onChange={setField('description')} placeholder={t('expenses.briefDescription')} />
            </Field>
            <Field label={t('expenses.supplierPerson')}>
              <input className="input" value={form.supplier} onChange={setField('supplier')} />
            </Field>
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
        title={t('expenses.deleteTitle')}
        message={t('expenses.deleteMsg')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}