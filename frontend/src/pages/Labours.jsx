import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { laboursApi, labourExpensesApi } from '../api';
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
import { Badge } from '../components/Badge';
import { num, inr, todayInput } from '../utils/format';
import Field from '../components/Field';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const ROLES = ['Worker', 'Supervisor', 'Driver', 'Cleaner', 'Other'];
const LABOUR_CATEGORIES = ['Food', 'Market', 'Travel', 'Bus', 'Medicine', 'Other'];

function emptyLabourForm() {
  return { name: '', mobile: '', role: 'Worker', dailyWage: '', hiredDate: todayInput(), notes: '' };
}

function emptyExpenseForm() {
  return { labour: '', category: 'Food', purpose: '', amount: '', date: todayInput(), notes: '' };
}

export default function Labours() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useLanguage();
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [labourModal, setLabourModal] = useState(false);
  const [editingLabour, setEditingLabour] = useState(null);
  const [labourForm, setLabourForm] = useState(emptyLabourForm());
  const [savingLabour, setSavingLabour] = useState(false);
  const [confirmLabour, setConfirmLabour] = useState(null);
  const [expModal, setExpModal] = useState(false);
  const [expForm, setExpForm] = useState(emptyExpenseForm());
  const [savingExp, setSavingExp] = useState(false);

  const { data, loading, error, refetch } = useFetch(
    laboursApi.getAll,
    { role: roleFilter, search },
    { labours: [], summary: {} }
  );

  const { data: expData, refetch: refetchExp } = useFetch(
    labourExpensesApi.getAll,
    { range: '30' },
    { expenses: [], summary: {} }
  );

  const labours = data?.labours || [];
  const summary = data?.summary || {};
  const expenses = expData?.expenses || [];

  const labourSetLabour = (id) => (e) => setLabourForm((f) => ({ ...f, [id]: e.target.value }));

  const openLabourCreate = () => {
    setEditingLabour(null);
    setLabourForm(emptyLabourForm());
    setLabourModal(true);
  };

  const openLabourEdit = (rec) => {
    setEditingLabour(rec);
    setLabourForm({
      name: rec.name || '',
      mobile: rec.mobile || '',
      role: rec.role || 'Worker',
      dailyWage: rec.dailyWage ?? '',
      hiredDate: rec.hiredDate ? rec.hiredDate.slice(0, 10) : '',
      notes: rec.notes || '',
    });
    setLabourModal(true);
  };

  const handleLabourSave = async (e) => {
    e.preventDefault();
    if (!labourForm.name.trim()) { toast.error(t('labour.validationName')); return; }
    if (labourForm.dailyWage !== '' && Number(labourForm.dailyWage) < 0) { toast.error(t('labour.validationWage')); return; }
    setSavingLabour(true);
    try {
      if (editingLabour) {
        await laboursApi.update(editingLabour._id, labourForm);
        toast.success(t('labour.updated'));
      } else {
        await laboursApi.create(labourForm);
        toast.success(t('labour.created'));
      }
      setLabourModal(false);
      refetch();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setSavingLabour(false); }
  };

  const handleLabourDelete = async (rec) => {
    try { await laboursApi.remove(rec._id); toast.success(t('labour.deleted')); refetch(); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleToggle = async (rec) => {
    try { await laboursApi.toggle(rec._id); toast.success(t('labour.toggled')); refetch(); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const openExpCreate = (labourId) => {
    setExpForm({ ...emptyExpenseForm(), labour: labourId || '' });
    setExpModal(true);
  };

  const handleExpSave = async (e) => {
    e.preventDefault();
    if (!expForm.labour) { toast.error(t('labexp.validationLabour')); return; }
    if (!expForm.purpose.trim()) { toast.error(t('labexp.validationPurpose')); return; }
    if (!expForm.amount || Number(expForm.amount) <= 0) { toast.error(t('labexp.validationAmount')); return; }
    setSavingExp(true);
    try { await labourExpensesApi.create(expForm); toast.success(t('labexp.created')); setExpModal(false); refetch(); refetchExp(); } catch (err) { toast.error(getErrorMessage(err)); } finally { setSavingExp(false); }
  };

  // Recent expenses chart — by labourer
  const byLabour = {};
  expenses.forEach((e) => {
    const name = e.labour?.name || '—';
    byLabour[name] = (byLabour[name] || 0) + e.amount;
  });
  const chartData = Object.entries(byLabour).map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));

  const labourColumns = [
    { key: 'name', header: t('labour.name'), render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'mobile', header: t('labour.mobile'), render: (r) => r.mobile || '-' },
    { key: 'role', header: t('labour.role'), render: (r) => <Badge>{t('labour.roles.' + (r.role || 'Other'))}</Badge> },
    { key: 'dailyWage', header: t('labour.dailyWage'), render: (r) => <span className="font-semibold">{inr(r.dailyWage || 0, 0)}</span> },
    { key: 'totalExpense', header: t('labour.totalExpenses'), render: (r) => <span className="font-semibold text-red-600">{inr(r.totalExpense)}</span> },
    { key: 'isActive', header: t('labour.active'), render: (r) => <Badge>{r.isActive ? t('status.ACTIVE') : t('status.INACTIVE')}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title={t('labour.title')}
        subtitle={t('labour.subtitle')}
        actions={[
          <button key="exp" className="btn-secondary" onClick={() => openExpCreate('')}>
            <Icon name="expense" className="h-4 w-4" /> {t('labexp.addExpense')}
          </button>,
          <button key="add" className="btn-primary" onClick={openLabourCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('labour.addLabour')}
          </button>,
        ]}
      />

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('labour.summary.totalLabours')}</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">{num(summary.total || 0)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('labour.summary.activeLabours')}</p>
          <p className="mt-0.5 text-xl font-bold text-emerald-600">{num(summary.active || 0)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('labour.summary.totalExpense')}</p>
          <p className="mt-0.5 text-xl font-bold text-red-600">{inr(summary.totalExpense || 0)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('labour.summary.thisMonth')}</p>
          <p className="mt-0.5 text-xl font-bold text-orange-600">{inr(summary.monthExpense || 0)}</p>
        </div>
      </div>

      {/* Recent-expenses chart */}
      {chartData.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2">{t('labexp.breakdownByLabour')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, t('common.amount')]} />
              <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <label className="label mb-0">{t('labour.role')}:</label>
        <select
          className="input !w-auto"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            refetch({ role: e.target.value });
          }}
        >
          <option value="">{t('common.all')}</option>
          {ROLES.map((r) => <option key={r} value={r}>{t('labour.roles.' + r)}</option>)}
        </select>
        <input
          className="input !w-48"
          placeholder={`${t('common.search')}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            refetch({ search: e.target.value });
          }}
        />
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={labourColumns}
        rows={loading ? [] : labours}
        loading={loading}
        emptyTitle={t('labour.noRecords')}
        emptyHint={t('labour.noRecordsHint')}
        actions={(record) => (
          <div className="flex items-center gap-0.5">
            <button className="btn-ghost !px-2 text-xs" onClick={() => navigate('/labours/' + record._id)} title={t('labour.viewLedger')}>
              <Icon name="eye" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 text-xs" onClick={() => openExpCreate(record._id)} title={t('labexp.addExpense')}>
              <Icon name="expense" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 text-xs" onClick={() => openLabourEdit(record)} title={t('common.edit')}>
              <Icon name="edit" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 text-xs" onClick={() => handleToggle(record)} title={t('labour.toggled')}>
              <Icon name="settings" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 text-xs !text-red-600" onClick={() => setConfirmLabour(record)} title={t('common.delete')}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </div>
        )}
      />

      {/* Labour create/edit modal */}
      <Modal open={labourModal} onClose={() => setLabourModal(false)} title={editingLabour ? t('labour.editTitle') : t('labour.createTitle')}>
        <form onSubmit={handleLabourSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`${t('labour.name')} *`}>
              <input className="input" value={labourForm.name} onChange={labourSetLabour('name')} required />
            </Field>
            <Field label={t('labour.mobile')}>
              <input className="input" value={labourForm.mobile} onChange={labourSetLabour('mobile')} />
            </Field>
            <Field label={t('labour.role')}>
              <select className="input" value={labourForm.role} onChange={labourSetLabour('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{t('labour.roles.' + r)}</option>)}
              </select>
            </Field>
            <Field label={`${t('labour.dailyWage')} (₹)`}>
              <input className="input" type="number" min="0" step="1" value={labourForm.dailyWage} onChange={labourSetLabour('dailyWage')} />
            </Field>
            <Field label={t('labour.hiredDate')}>
              <input className="input" type="date" value={labourForm.hiredDate} onChange={labourSetLabour('hiredDate')} />
            </Field>
          </div>
          <Field label={t('common.notes')}>
            <textarea className="input" rows="2" value={labourForm.notes} onChange={labourSetLabour('notes')} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setLabourModal(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={savingLabour}>{savingLabour ? t('common.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      {/* Quick expense modal */}
      <Modal open={expModal} onClose={() => setExpModal(false)} title={t('labexp.createTitle')}>
        <form onSubmit={handleExpSave} className="space-y-4">
          <Field label={`${t('labexp.labour')} *`}>
            <select className="input" value={expForm.labour} onChange={(e) => setExpForm((f) => ({ ...f, labour: e.target.value }))} required>
              <option value="">{t('labexp.selectLabour')}</option>
              {labours.filter((l) => l.isActive).map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('labexp.category')}>
              <select className="input" value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}>
                {LABOUR_CATEGORIES.map((c) => <option key={c} value={c}>{t('labexp.categories.' + c)}</option>)}
              </select>
            </Field>
            <Field label={`${t('labexp.amount')} (₹) *`}>
              <input className="input" type="number" min="0.01" step="0.01" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} required />
            </Field>
          </div>
          <Field label={`${t('labexp.purpose')} *`}>
            <input className="input" value={expForm.purpose} onChange={(e) => setExpForm((f) => ({ ...f, purpose: e.target.value }))} required placeholder={t('labexp.purpose')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('common.date')}>
              <input className="input" type="date" value={expForm.date} onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label={t('labexp.notesOptional')}>
              <input className="input" value={expForm.notes} onChange={(e) => setExpForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setExpModal(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={savingExp}>{savingExp ? t('common.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmLabour)}
        onClose={() => setConfirmLabour(null)}
        onConfirm={() => handleLabourDelete(confirmLabour)}
        title={t('labour.deleteTitle')}
        message={t('labour.deleteMsg')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}