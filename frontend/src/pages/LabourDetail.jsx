import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { laboursApi, labourExpensesApi } from '../api';
import { getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import { LoadingBox, ErrorBox } from '../components/Spinner';
import { Badge } from '../components/Badge';
import { num, inr, fmtDate, todayInput } from '../utils/format';
import Modal from '../components/Modal';
import Field from '../components/Field';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const LABOUR_CATEGORIES = ['Food', 'Market', 'Travel', 'Bus', 'Medicine', 'Other'];

function SummaryCard({ label, value, accent = '' }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-emerald-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

export default function LabourDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState('30');
  const [expModal, setExpModal] = useState(false);
  const [expForm, setExpForm] = useState({ category: 'Food', purpose: '', amount: '', date: todayInput(), notes: '' });
  const [savingExp, setSavingExp] = useState(false);
  const [editExp, setEditExp] = useState(null);

  const load = (r) => {
    setLoading(true);
    laboursApi
      .get(id, { range: r || range })
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const changeRange = (r) => { setRange(r); load(r); };

  if (loading) return <LoadingBox label={t('common.loading')} />;
  if (error) return <ErrorBox message={error} onRetry={() => load()} />;
  const { labour = {}, ledger = {} } = data || {};
  const { expenses = [], byCategory = [] } = ledger;

  const chartData = byCategory.map((c) => ({ name: t('labexp.categories.' + (c.category || 'Other')), amount: c.amount }));

  const openCreate = () => { setEditExp(null); setExpForm({ category: 'Food', purpose: '', amount: '', date: todayInput(), notes: '' }); setExpModal(true); };
  const openEdit = (ex) => { setEditExp(ex); setExpForm({ category: ex.category || 'Other', purpose: ex.purpose || '', amount: ex.amount || '', date: ex.date ? ex.date.slice(0, 10) : todayInput(), notes: ex.notes || '' }); setExpModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!expForm.purpose.trim()) { toast.error(t('labexp.validationPurpose')); return; }
    if (!expForm.amount || Number(expForm.amount) <= 0) { toast.error(t('labexp.validationAmount')); return; }
    setSavingExp(true);
    try {
      if (editExp) { await labourExpensesApi.update(editExp._id, expForm); toast.success(t('labexp.updated')); }
      else { await labourExpensesApi.create({ ...expForm, labour: id }); toast.success(t('labexp.created')); }
      setExpModal(false);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setSavingExp(false); }
  };

  const handleDeleteExp = async (ex) => {
    try { await labourExpensesApi.remove(ex._id); toast.success(t('labexp.deleted')); load(); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader
        title={labour.name || '—'}
        subtitle={`${labour.mobile || '—'} · ${t('labour.roles.' + (labour.role || 'Other'))} · ${t('labour.dailyWage')}: ${inr(labour.dailyWage || 0, 0)} · ${labour.hiredDate ? fmtDate(labour.hiredDate) : '—'}`}
        actions={[
          <button key="back" className="btn-secondary" onClick={() => navigate('/labours')}>
            ← {t('common.back')}
          </button>,
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('labexp.addExpense')}
          </button>,
        ]}
      />

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label={t('laboursummary.totalExpense')} value={inr(ledger.totalExpense || 0)} accent="red" />
        <SummaryCard label={t('laboursummary.thisMonth')} value={inr(ledger.monthExpense || 0)} />
        <SummaryCard label={t('laboursummary.transactions')} value={num(ledger.expenseCount || 0)} />
        <SummaryCard
          label={t('laboursummary.statusBadge')}
          value={labour.isActive ? t('status.ACTIVE') : t('status.INACTIVE')}
          accent={labour.isActive ? 'green' : 'red'}
        />
      </div>

      {/* Category breakdown chart */}
      {chartData.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2">{t('laboursummary.breakdown')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, t('common.amount')]} />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Range filter */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <label className="label mb-0">{t('expenses.period')}</label>
        <select className="input !w-auto" value={range} onChange={(e) => changeRange(e.target.value)}>
          <option value="today">{t('common.today')}</option>
          <option value="7">{t('common.last7')}</option>
          <option value="30">{t('common.last30')}</option>
          <option value="month">{t('common.month')}</option>
          <option value="year">{t('common.year')}</option>
        </select>
      </div>

      {/* Expense ledger table */}
      <div className="card overflow-hidden mb-4">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="font-bold text-slate-800">{t('laboursummary.ledger')}</h3>
        </div>
        {expenses.length ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">{t('common.date')}</th>
                    <th className="px-4 py-2.5">{t('labexp.category')}</th>
                    <th className="px-4 py-2.5">{t('labexp.purpose')}</th>
                    <th className="px-4 py-2.5">{t('common.amount')}</th>
                    <th className="px-4 py-2.5">{t('common.notes')}</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.map((ex) => (
                    <tr key={ex._id} className="hover:bg-orange-50/50">
                      <td className="px-4 py-2.5">{fmtDate(ex.date)}</td>
                      <td className="px-4 py-2.5"><Badge>{t('labexp.categories.' + (ex.category || 'Other'))}</Badge></td>
                      <td className="px-4 py-2.5 font-semibold">{ex.purpose}</td>
                      <td className="px-4 py-2.5 text-red-600 font-bold">{inr(ex.amount)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{ex.notes || '-'}</td>
                      <td className="px-4 py-2.5">
                        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => openEdit(ex)} title={t('common.edit')}>
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button className="btn-ghost !px-2 !py-1 text-xs !text-red-600" onClick={() => handleDeleteExp(ex)} title={t('common.delete')}>
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {expenses.map((ex) => (
                <div key={ex._id} className="p-4 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">{fmtDate(ex.date)}</span>
                    <Badge>{t('labexp.categories.' + (ex.category || 'Other'))}</Badge>
                  </div>
                  <div className="font-semibold text-slate-800">{ex.purpose}</div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">{t('common.amount')}</span>
                    <span className="font-bold text-red-600">{inr(ex.amount)}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => openEdit(ex)}>{t('common.edit')}</button>
                    <button className="btn-ghost !px-2 !py-1 text-xs !text-red-600" onClick={() => handleDeleteExp(ex)}>{t('common.delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">{t('laboursummary.noExpenses')}</p>
        )}
      </div>

      {/* Create / edit expense modal */}
      <Modal open={expModal} onClose={() => setExpModal(false)} title={editExp ? t('labexp.editTitle') : t('labexp.createTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
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
            <input className="input" value={expForm.purpose} onChange={(e) => setExpForm((f) => ({ ...f, purpose: e.target.value }))} required />
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
    </div>
  );
}