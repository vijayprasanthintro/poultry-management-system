import { useEffect, useState } from 'react';
import { paymentsApi, customersApi, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/Spinner';
import { Badge } from '../components/Badge';
import { num, inr, fmtDate, todayInput } from '../utils/format';
import Field from '../components/Field';

const METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Cheque', 'Other'];

function methodLabel(t, m) {
  if (METHODS.includes(m)) return t('sales.methods.' + m);
  return m;
}

const RANGES = [
  { value: 'today', labelKey: 'common.today' },
  { value: 'yesterday', labelKey: 'common.yesterday' },
  { value: '7', labelKey: 'common.last7' },
  { value: '30', labelKey: 'common.last30' },
  { value: 'month', labelKey: 'common.month' },
  { value: 'year', labelKey: 'common.year' },
];

export default function Payments() {
  const toast = useToast();
  const { t } = useLanguage();
  const [range, setRange] = useState('month');
  const [customerFilter, setCustomerFilter] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ amount: '', paymentDate: todayInput(), paymentMethod: 'Cash', notes: '' });
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ total: 0, count: 0 });

  const { data: customersData } = useFetch(customersApi.getAll, {}, { customers: [] });
  const { data, loading, error, refetch } = useFetch(
    paymentsApi.getAll,
    { range, customer: customerFilter },
    { payments: [] }
  );

  useEffect(() => {
    refetch({ range, customer: customerFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customerFilter]);

  const payments = data?.payments || [];
  useEffect(() => {
    setSummary({
      total: payments.reduce((a, p) => a + (p.amount || 0), 0),
      count: payments.length,
    });
  }, [payments]);

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      amount: p.amount,
      paymentDate: p.paymentDate ? p.paymentDate.slice(0, 10) : todayInput(),
      paymentMethod: p.paymentMethod || 'Cash',
      notes: p.notes || '',
    });
    setEditModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error(t('payments.validationAmount'));
      return;
    }
    setSaving(true);
    try {
      await paymentsApi.update(editing._id, form);
      toast.success(t('payments.updated'));
      setEditModal(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, t('payments.updateError')));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'paymentDate', header: t('payments.date'), render: (r) => fmtDate(r.paymentDate) },
    {
      key: 'customer',
      header: t('payments.customer'),
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-900">{r.customer?.name || t('sales.unknown')}</span>
          {r.customer?.mobile && <p className="text-xs text-slate-500">{r.customer.mobile}</p>}
        </div>
      ),
    },
    { key: 'amount', header: t('common.amount'), render: (r) => <span className="font-bold text-emerald-600">{inr(r.amount)}</span> },
    {
      key: 'sale',
      header: t('payments.forSale'),
      render: (r) =>
        r.sale ? (
          <span className="text-xs text-slate-600">
            {inr(r.sale.totalAmount)} · {fmtDate(r.sale.date)}
          </span>
        ) : (
          '-'
        ),
    },
    { key: 'paymentMethod', header: t('payments.method'), render: (r) => <Badge className="bg-slate-100 text-slate-700">{methodLabel(t, r.paymentMethod)}</Badge> },
    { key: 'notes', header: t('common.notes'), render: (r) => r.notes || '-' },
  ];

  return (
    <div>
      <PageHeader
        title={t('payments.title')}
        subtitle={t('payments.subtitle')}
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('payments.totalReceived')}</p>
          <p className="mt-0.5 text-xl font-bold text-emerald-600">{inr(summary.total)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('payments.count')}</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">{num(summary.count)}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value)}>
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{t(r.labelKey)}</option>
          ))}
        </select>
        <select className="input !w-auto min-w-[180px]" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
          <option value="">{t('payments.allCustomers')}</option>
          {(customersData?.customers || []).map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : payments}
        loading={loading}
        emptyTitle={t('payments.noPayments')}
        emptyHint={t('payments.noPaymentsHint')}
        actions={(p) => (
          <button className="btn-ghost !px-2" onClick={() => openEdit(p)} title={t('common.edit')}>
            <Icon name="edit" className="h-4 w-4" />
          </button>
        )}
      />

      <Modal open={editModal} onClose={() => setEditModal(false)} title={t('payments.editTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {editing?.customer?.name} · {t('payments.forSale')} {editing?.sale ? inr(editing.sale.totalAmount) : ''} ·{' '}
            {editing?.sale ? fmtDate(editing.sale.date) : ''}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`${t('common.amount')} (₹) *`}>
              <input className="input" type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </Field>
            <Field label={t('payments.method')}>
              <select className="input" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>{t('sales.methods.' + m)}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t('payments.date')}>
            <input className="input" type="date" value={form.paymentDate} onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))} />
          </Field>
          <Field label={t('common.notes')}>
            <input className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditModal(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('payments.update')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}