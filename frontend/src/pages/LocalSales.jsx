import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesApi, customersApi, setsApi, eggStockApi, getErrorMessage } from '../api';
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
import { num, inr, fmtDate, todayInput } from '../utils/format';
import Field from '../components/Field';

function emptySaleForm() {
  return {
    date: todayInput(),
    customer: '',
    set: '',
    singleEggQuantity: '',
    doubleEggQuantity: '',
    singleEggPrice: '',
    doubleEggPrice: '',
    paidAmount: 0,
    paymentMethod: 'Cash',
    notes: '',
  };
}

const calcSale = (f) => {
  const sq = Number(f.singleEggQuantity) || 0;
  const dq = Number(f.doubleEggQuantity) || 0;
  const sp = Number(f.singleEggPrice) || 0;
  const dp = Number(f.doubleEggPrice) || 0;
  return {
    single: sq,
    dbl: dq,
    singlePrice: sp,
    dblPrice: dp,
    eggQuantity: sq + dq,
    total: Math.round((sq * sp + dq * dp) * 100) / 100,
  };
};

function emptyNewCustomer() {
  return { name: '', mobile: '', area: '', address: '', customerType: 'Household', defaultPrice: '' };
}

const CUSTOMER_TYPES = ['Household', 'Shop', 'Hotel', 'Restaurant', 'Bakery', 'Regular Customer', 'Other'];

export default function LocalSales() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [range, setRange] = useState('today');
  const [statusFilter, setStatusFilter] = useState('');
  const [saleModal, setSaleModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySaleForm());
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState(emptyNewCustomer());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [available, setAvailable] = useState(null);
  const [summary, setSummary] = useState(null);

  const { data: customersData } = useFetch(customersApi.getAll, {}, { customers: [] });
  const { data: setsData } = useFetch(setsApi.getAll, {}, { sets: [] });
  const { data: stockData, refetch: stockRefetch } = useFetch(eggStockApi.latest);
  const { data, loading, error, refetch } = useFetch(
    salesApi.getAll,
    { range, paymentStatus: statusFilter },
    { sales: [] }
  );

  useEffect(() => {
    refetch({ range, paymentStatus: statusFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, statusFilter]);

  useEffect(() => {
    setAvailable(stockData?.availableToday ?? null);
  }, [stockData]);

  const sales = data?.sales || [];
  useEffect(() => {
    setSummary({
      customers: new Set(sales.map((s) => String(s.customer?._id))).size,
      singleEggs: sales.reduce((a, s) => a + (s.singleEggQuantity != null ? Number(s.singleEggQuantity) : Number(s.eggQuantity)), 0),
      doubleEggs: sales.reduce((a, s) => a + (Number(s.doubleEggQuantity) || 0), 0),
      eggs: sales.reduce((a, s) => a + (s.eggQuantity || 0), 0),
      revenue: sales.reduce((a, s) => a + (s.totalAmount || 0), 0),
      received: sales.reduce((a, s) => a + (s.paidAmount || 0), 0),
      pending: sales.reduce((a, s) => a + (s.pendingAmount || 0), 0),
    });
  }, [sales]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onCustomerChange = (e) => {
    const id = e.target.value;
    setForm((f) => {
      const cust = (customersData?.customers || []).find((c) => c._id === id);
      const price = f.singleEggPrice === '' ? (cust?.defaultPrice ? String(cust.defaultPrice) : '') : f.singleEggPrice;
      return { ...f, customer: id, singleEggPrice: price };
    });
  };

  const calc = calcSale(form);
  const total = calc.total;

  const openCreate = () => {
    setEditing(null);
    setForm(emptySaleForm());
    setShowNewCustomer(false);
    setSaleModal(true);
  };

  const openEdit = (sale) => {
    setEditing(sale);
    const qty = sale.eggQuantity || 0;
    const singleQty = sale.singleEggQuantity != null ? sale.singleEggQuantity : qty;
    const dblQty = sale.doubleEggQuantity || 0;
    const price = sale.pricePerEgg || 0;
    setForm({
      date: sale.date ? sale.date.slice(0, 10) : todayInput(),
      customer: sale.customer?._id || sale.customer || '',
      set: sale.set?._id || sale.set || '',
      singleEggQuantity: singleQty,
      doubleEggQuantity: dblQty,
      singleEggPrice: sale.singleEggPrice != null ? sale.singleEggPrice : price,
      doubleEggPrice: sale.doubleEggPrice || price,
      paidAmount: sale.paidAmount,
      paymentMethod: sale.paymentMethod || 'Cash',
      notes: sale.notes || '',
    });
    setShowNewCustomer(false);
    setSaleModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.customer) {
      toast.error(t('sales.validationCustomer'));
      return;
    }
    const saleCalc = calcSale(form);
    if (saleCalc.eggQuantity <= 0) {
      toast.error(t('sales.validationQty'));
      return;
    }
    if (form.singleEggQuantity !== '' && Number(form.singleEggQuantity) > 0 && (form.singleEggPrice === '' || Number(form.singleEggPrice) < 0)) {
      toast.error(t('sales.validationSinglePrice'));
      return;
    }
    if (form.doubleEggQuantity !== '' && Number(form.doubleEggQuantity) > 0 && (form.doubleEggPrice === '' || Number(form.doubleEggPrice) < 0)) {
      toast.error(t('sales.validationDoublePrice'));
      return;
    }
    const payload = {
      ...form,
      singleEggQuantity: form.singleEggQuantity === '' ? 0 : Number(form.singleEggQuantity),
      doubleEggQuantity: form.doubleEggQuantity === '' ? 0 : Number(form.doubleEggQuantity),
      singleEggPrice: form.singleEggPrice === '' ? 0 : Number(form.singleEggPrice),
      doubleEggPrice: form.doubleEggPrice === '' ? 0 : Number(form.doubleEggPrice),
      eggQuantity: saleCalc.eggQuantity,
      pricePerEgg: saleCalc.eggQuantity > 0 ? Math.round((saleCalc.total / saleCalc.eggQuantity) * 100) / 100 : 0,
    };
    setSaving(true);
    try {
      if (editing) {
        await salesApi.update(editing._id, payload);
        toast.success(t('sales.updated'));
      } else {
        await salesApi.create(payload);
        toast.success(t('sales.created'));
      }
      setSaleModal(false);
      refetch();
      stockRefetch();
    } catch (err) {
      toast.error(getErrorMessage(err, t('sales.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const quickCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name) {
      toast.error(t('customers.nameRequired'));
      return;
    }
    try {
      const { data: res } = await customersApi.create(newCustomer);
      toast.success(t('customers.created'));
      setForm((f) => ({ ...f, customer: res.customer._id }));
      setShowNewCustomer(false);
      setNewCustomer(emptyNewCustomer());
    } catch (err) {
      toast.error(getErrorMessage(err, t('sales.saveError')));
    }
  };

  const handleDelete = async (sale) => {
    try {
      await salesApi.remove(sale._id);
      toast.success(t('sales.deleted'));
      refetch();
      stockRefetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
    {
      key: 'customer',
      header: t('sales.customer'),
      render: (r) => (
        <div>
          <button className="font-semibold text-slate-900 hover:text-brand-700" onClick={() => navigate(`/customers/${r.customer?._id}`)}>
            {r.customer?.name || t('sales.unknown')}
          </button>
          {r.customer?.mobile && <p className="text-xs text-slate-500">{r.customer.mobile}</p>}
        </div>
      ),
    },
    { key: 'singleEggQuantity', header: t('sales.singleSold'), render: (r) => num(r.singleEggQuantity != null ? r.singleEggQuantity : r.eggQuantity) },
    { key: 'doubleEggQuantity', header: t('sales.doubleSold'), render: (r) => <span className="text-violet-600">{num(r.doubleEggQuantity)}</span> },
    { key: 'eggQuantity', header: t('sales.eggsSold'), render: (r) => <span className="font-bold">{num(r.eggQuantity)}</span> },
    { key: 'singleEggPrice', header: t('sales.singlePrice'), render: (r) => `₹${Number(r.singleEggPrice != null ? r.singleEggPrice : r.pricePerEgg).toFixed(2)}` },
    { key: 'doubleEggPrice', header: t('sales.doublePrice'), render: (r) => `₹${Number(r.doubleEggPrice != null ? r.doubleEggPrice : r.pricePerEgg).toFixed(2)}` },
    { key: 'totalAmount', header: t('common.total'), render: (r) => <span className="font-semibold">{inr(r.totalAmount)}</span> },
    { key: 'paidAmount', header: t('common.paid'), render: (r) => <span className="text-emerald-600">{inr(r.paidAmount)}</span> },
    { key: 'pendingAmount', header: t('common.pending'), render: (r) => <span className={r.pendingAmount > 0 ? 'font-bold text-red-600' : 'text-slate-400'}>{inr(r.pendingAmount)}</span> },
    { key: 'paymentStatus', header: t('sales.statusLabel'), render: (r) => <Badge>{r.paymentStatus}</Badge> },
    { key: 'paymentMethod', header: t('sales.methodShort'), render: (r) => t('sales.methods.' + (r.paymentMethod || 'Other')) },
  ];

  return (
    <div>
      <PageHeader
        title={t('sales.title')}
        subtitle={t('sales.subtitle')}
        actions={[
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('sales.addSale')}
          </button>,
        ]}
      />

      {summary && (
        <div className="mb-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <SummaryBox label={t('sales.customers')} value={num(summary.customers)} />
          <SummaryBox label={t('sales.singleSold')} value={num(summary.singleEggs)} />
          <SummaryBox label={t('sales.doubleSold')} value={num(summary.doubleEggs)} accent="violet" />
          <SummaryBox label={t('sales.eggsSold')} value={num(summary.eggs)} />
          <SummaryBox label={t('sales.sales')} value={inr(summary.revenue)} />
          <SummaryBox label={t('sales.pending')} value={inr(summary.pending)} accent={summary.pending > 0 ? 'red' : 'green'} />
        </div>
      )}

      {available != null && available <= 0 && !sales.length && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {t('sales.noStock')}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="today">{t('common.today')}</option>
          <option value="yesterday">{t('common.yesterday')}</option>
          <option value="7">{t('common.last7')}</option>
          <option value="30">{t('common.last30')}</option>
          <option value="month">{t('common.month')}</option>
          <option value="year">{t('common.year')}</option>
        </select>
        <select className="input !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t('sales.allStatuses')}</option>
          <option value="PAID">{t('status.PAID')}</option>
          <option value="PARTIAL">{t('status.PARTIAL')}</option>
          <option value="PENDING">{t('status.PENDING')}</option>
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : sales}
        loading={loading}
        emptyTitle={t('sales.noRecords')}
        emptyHint={t('sales.noRecordsHint')}
        actions={(sale) => (
          <>
            <button className="btn-ghost !px-2" onClick={() => openEdit(sale)} title={t('common.edit')}>
              <Icon name="edit" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 !text-red-600" onClick={() => setConfirm(sale)} title={t('common.delete')}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <Modal open={saleModal} onClose={() => setSaleModal(false)} title={editing ? t('sales.editTitle') : t('sales.createTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
          {!showNewCustomer ? (
            <Field label={`${t('sales.customer')} *`}>
              <div className="flex gap-2">
                <select className="input" value={form.customer} onChange={onCustomerChange} required>
                  <option value="">{t('sales.selectCustomer')}</option>
                  {(customersData?.customers || []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}{c.mobile ? ` · ${c.mobile}` : ''}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => setShowNewCustomer(true)}>
                  {t('sales.newCustomerShort')}
                </button>
              </div>
            </Field>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{t('sales.addNewCustomer')}</p>
                <button type="button" className="text-xs text-brand-600" onClick={() => setShowNewCustomer(false)}>{t('common.cancel')}</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder={`${t('common.name')} *`} value={newCustomer.name} onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))} />
                <input className="input" placeholder={t('customers.mobileOptional')} value={newCustomer.mobile} onChange={(e) => setNewCustomer((c) => ({ ...c, mobile: e.target.value }))} />
                <input className="input" placeholder={t('customers.area')} value={newCustomer.area} onChange={(e) => setNewCustomer((c) => ({ ...c, area: e.target.value }))} />
                <select
                  className="input"
                  value={newCustomer.customerType}
                  onChange={(e) => setNewCustomer((c) => ({ ...c, customerType: e.target.value }))}
                >
                  {CUSTOMER_TYPES.map((ty) => (
                    <option key={ty} value={ty}>{t('customers.customerTypes.' + ty)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  className="input !w-36"
                  placeholder={t('sales.defaultPricePh')}
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCustomer.defaultPrice}
                  onChange={(e) => setNewCustomer((c) => ({ ...c, defaultPrice: e.target.value }))}
                />
                <button type="button" className="btn-primary flex-1" onClick={quickCreateCustomer}>{t('sales.createCustomer')}</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('common.date')}>
              <input className="input" type="date" value={form.date} onChange={setField('date')} />
            </Field>
            <Field label={t('sales.setOptional')}>
              <select className="input" value={form.set} onChange={setField('set')}>
                <option value="">{t('sales.general')}</option>
                {(setsData?.sets || []).map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label={t('sales.singleEggs')}>
              <input className="input" type="number" min="0" value={form.singleEggQuantity} onChange={setField('singleEggQuantity')} placeholder="0" />
            </Field>
            <Field label={t('sales.singlePriceLabel')}>
              <input className="input" type="number" step="0.01" min="0" value={form.singleEggPrice} onChange={setField('singleEggPrice')} placeholder={t('sales.egsPlaceholder')} />
            </Field>
            <Field label={t('sales.doubleEggs')}>
              <input className="input" type="number" min="0" value={form.doubleEggQuantity} onChange={setField('doubleEggQuantity')} placeholder="0" />
            </Field>
            <Field label={t('sales.doublePriceLabel')}>
              <input className="input" type="number" step="0.01" min="0" value={form.doubleEggPrice} onChange={setField('doubleEggPrice')} placeholder={t('sales.egsPlaceholder')} />
            </Field>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-800">{t('sales.totalAmount')}</span>
              <span className="text-xl font-bold text-emerald-800">{inr(total)}</span>
            </div>
            <p className="text-xs text-emerald-600">
              {t('sales.eggsBreakdown', {
                eggs: num(calc.eggQuantity),
                s: num(calc.single),
                sp: Number(calc.singlePrice).toFixed(2),
                d: num(calc.dbl),
                dp: Number(calc.dblPrice).toFixed(2),
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('sales.amountPaid')}>
              <input className="input" type="number" step="0.01" min="0" value={form.paidAmount} onChange={setField('paidAmount')} placeholder={t('sales.amountPlaceholder')} />
            </Field>
            <Field label={t('sales.paymentMethod')}>
              <select className="input" value={form.paymentMethod} onChange={setField('paymentMethod')}>
                {['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Cheque', 'Other'].map((m) => (
                  <option key={m} value={m}>{t('sales.methods.' + m)}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-600">
            {t('sales.pendingRow', { amount: inr(total - Number(form.paidAmount || 0)) })}
            {available != null && (
              <span className="ml-3 text-xs text-slate-400">{t('sales.available', { eggs: num(available) })}</span>
            )}
          </div>

          <Field label={t('sales.notesLabel')}>
            <input className="input" value={form.notes} onChange={setField('notes')} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setSaleModal(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('sales.saveSale')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title={t('sales.deleteTitle')}
        message={t('sales.deleteMsg')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}

function SummaryBox({ label, value, accent = '' }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-emerald-600' : accent === 'violet' ? 'text-violet-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}