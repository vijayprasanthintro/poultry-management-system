import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersApi, paymentsApi } from '../api';
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

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ sale: '', amount: '', paymentDate: todayInput(), paymentMethod: 'Cash', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    customersApi
      .ledger(id)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingBox label={t('customerdetail.ledgerLoading')} />;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  const { customer, sales, payments, totals } = data || {
    customer: {},
    sales: [],
    payments: [],
    totals: { eggs: 0, amount: 0, paid: 0, pending: 0 },
  };

  const pendingSales = sales.filter((s) => s.pendingAmount > 0);

  const openPay = (sale) => {
    setPayForm({ sale: sale._id, amount: sale.pendingAmount || '', paymentDate: todayInput(), paymentMethod: 'Cash', notes: '' });
    setPayModal(true);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payForm.sale || !payForm.amount || Number(payForm.amount) <= 0) {
      toast.error(t('customerdetail.validation'));
      return;
    }
    setSaving(true);
    try {
      await paymentsApi.create({ customer: id, ...payForm });
      toast.success(t('customerdetail.paymentCreated'));
      setPayModal(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, t('customerdetail.paymentError')));
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = customer.customerType ? t('customers.customerTypes.' + customer.customerType) : '';

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={`${customer.mobile || t('customerdetail.mobileNo')} · ${customer.area || customer.address || t('customerdetail.address')} · ${typeLabel}`}
        actions={[
          <button key="back" className="btn-secondary" onClick={() => navigate('/customers')}>
            ← {t('customerdetail.back')}
          </button>,
          <button key="pay" className="btn-primary" onClick={() => pendingSales[0] && openPay(pendingSales[0])} disabled={!pendingSales.length}>
            <Icon name="payment" className="h-4 w-4" /> {t('customerdetail.recordPayment')}
          </button>,
        ]}
      />

      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Summary label={t('customerdetail.totalEggsPurchased')} value={num(totals.eggs)} />
        <Summary label={t('customerdetail.totalPurchaseAmount')} value={inr(totals.amount)} />
        <Summary label={t('customerdetail.totalPaid')} value={inr(totals.paid)} />
        <Summary label={t('customerdetail.totalPending')} value={inr(totals.pending)} accent={totals.pending > 0 ? 'red' : 'green'} />
      </div>

      {/* Purchase history */}
      <div className="card mb-4 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="font-bold text-slate-800">{t('customerdetail.purchaseHistory')}</h3>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">{t('common.date')}</th>
                <th className="px-4 py-2.5">{t('sales.eggsSold')}</th>
                <th className="px-4 py-2.5">{t('customerdetail.singleDouble')}</th>
                <th className="px-4 py-2.5">{t('customerdetail.amount')}</th>
                <th className="px-4 py-2.5">{t('customerdetail.paid')}</th>
                <th className="px-4 py-2.5">{t('customerdetail.pending')}</th>
                <th className="px-4 py-2.5">{t('sales.statusLabel')}</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((s) => (
                <tr key={s._id} className="hover:bg-orange-50/50">
                  <td className="px-4 py-2.5">{fmtDate(s.date)}</td>
                  <td className="px-4 py-2.5 font-semibold">{num(s.eggQuantity)}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span>{num(s.singleEggQuantity != null ? s.singleEggQuantity : s.eggQuantity)} {t('eggs.single')}</span>
                    {Number(s.doubleEggQuantity || 0) > 0 && (
                      <span className="text-violet-600">&nbsp;·&nbsp;{num(s.doubleEggQuantity)} {t('eggs.double')}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-semibold">{inr(s.totalAmount)}</td>
                  <td className="px-4 py-2.5 text-emerald-600">{inr(s.paidAmount)}</td>
                  <td className={`px-4 py-2.5 font-semibold ${s.pendingAmount > 0 ? 'text-red-600' : 'text-slate-500'}`}>{inr(s.pendingAmount)}</td>
                  <td className="px-4 py-2.5"><Badge>{s.paymentStatus}</Badge></td>
                  <td className="px-4 py-2.5">
                    {s.pendingAmount > 0 && (
                      <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => openPay(s)}>
                        {t('customerdetail.collect')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {sales.map((s) => (
            <div key={s._id} className="p-4 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{fmtDate(s.date)}</span>
                <Badge>{s.paymentStatus}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t('sales.eggsSold')}</span>
                <span className="font-semibold">
                  {num(s.eggQuantity)}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({num(s.singleEggQuantity != null ? s.singleEggQuantity : s.eggQuantity)} {t('eggs.single')}
                    {Number(s.doubleEggQuantity || 0) > 0 ? ` + ${num(s.doubleEggQuantity)} ${t('eggs.double')}` : ''})
                  </span>
                </span>
              </div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">{t('customerdetail.amount')}</span><span className="font-semibold">{inr(s.totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">{t('customerdetail.paid')}</span><span className="text-emerald-600">{inr(s.paidAmount)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">{t('customerdetail.pending')}</span><span className={`font-semibold ${s.pendingAmount > 0 ? 'text-red-600' : 'text-slate-500'}`}>{inr(s.pendingAmount)}</span></div>
              {s.pendingAmount > 0 && (
                <button className="btn-ghost w-full mt-1 text-xs" onClick={() => openPay(s)}>{t('customerdetail.recordPayment')}</button>
              )}
            </div>
          ))}
        </div>
        {!sales.length && <p className="py-8 text-center text-sm text-slate-400">{t('customerdetail.noPurchases')}</p>}
      </div>

      {/* Payment history */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="font-bold text-slate-800">{t('customerdetail.paymentHistory')}</h3>
        </div>
        {payments.length ? (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">{t('common.date')}</th>
                  <th className="px-4 py-2.5">{t('customerdetail.amount')}</th>
                  <th className="px-4 py-2.5">{t('customerdetail.paymentMethod')}</th>
                  <th className="px-4 py-2.5">{t('customerdetail.forSale')}</th>
                  <th className="px-4 py-2.5">{t('customerdetail.notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td className="px-4 py-2.5">{fmtDate(p.paymentDate)}</td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-600">{inr(p.amount)}</td>
                    <td className="px-4 py-2.5">{t('sales.methods.' + (p.paymentMethod || 'Other'))}</td>
                    <td className="px-4 py-2.5">{p.sale ? t('customerdetail.saleFor', { amount: inr(p.sale.totalAmount), date: fmtDate(p.sale.date) }) : '-'}</td>
                    <td className="px-4 py-2.5">{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!!payments.length && (
          <div className="md:hidden divide-y">
            {payments.map((p) => (
              <div key={p._id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">{fmtDate(p.paymentDate)}</span>
                  <span className="font-bold text-emerald-600">{inr(p.amount)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {t('sales.methods.' + (p.paymentMethod || 'Other'))}
                  {p.sale ? ` · ${t('customerdetail.saleFor', { amount: inr(p.sale.totalAmount), date: fmtDate(p.sale.date) })}` : ''}
                </p>
                {p.notes && <p className="mt-0.5 text-xs text-slate-400">{p.notes}</p>}
              </div>
            ))}
          </div>
        )}
        {!payments.length && (
          <p className="py-8 text-center text-sm text-slate-400">{t('customerdetail.noPayments')}</p>
        )}
      </div>

      <Modal open={payModal} onClose={() => setPayModal(false)} title={t('customerdetail.recordPayment')}>
        <form onSubmit={handlePay} className="space-y-4">
          <Field label={t('customerdetail.sale')}>
            <select
              className="input"
              value={payForm.sale}
              onChange={(e) => setPayForm((f) => ({ ...f, sale: e.target.value, amount: '' }))}
              required
            >
              <option value="">{t('customerdetail.selectSale')}</option>
              {pendingSales.map((s) => (
                <option key={s._id} value={s._id}>
                  {fmtDate(s.date)} — {num(s.eggQuantity)} {t('sales.eggsSold')} ({num(s.singleEggQuantity != null ? s.singleEggQuantity : s.eggQuantity)} {t('eggs.single')}
                  {Number(s.doubleEggQuantity || 0) > 0 ? ` + ${num(s.doubleEggQuantity)} ${t('eggs.double')}` : ''}) — {t('customerdetail.pending')} {inr(s.pendingAmount)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('customerdetail.paymentAmount')}>
              <input className="input" type="number" step="0.01" min="0.01" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} required />
            </Field>
            <Field label={t('customerdetail.paymentMethod')}>
              <select className="input" value={payForm.paymentMethod} onChange={(e) => setPayForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                {['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Cheque', 'Other'].map((m) => (
                  <option key={m} value={m}>{t('sales.methods.' + m)}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t('customerdetail.paymentDate')}>
            <input className="input" type="date" value={payForm.paymentDate} onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))} />
          </Field>
          <Field label={t('customerdetail.notes')}>
            <input className="input" value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setPayModal(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('customerdetail.recording') : t('customerdetail.record')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Summary({ label, value, accent = '' }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-emerald-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}