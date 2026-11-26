import { useEffect, useMemo, useState } from 'react';
import { wholesaleApi, eggStockApi, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import Icon from '../components/Icon';
import Field from '../components/Field';
import { ErrorBox } from '../components/Spinner';
import { num, inr, fmtDate, todayInput, toDateInput } from '../utils/format';

const EGG_CLASSES = ['Good', 'Broken'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Cheque', 'Other'];

function emptyForm() {
  return {
    date: todayInput(),
    eggClass: 'Broken',
    buyer: '',
    eggQuantity: '',
    pricePerEgg: '',
    paidAmount: 0,
    paymentMethod: 'Cash',
    notes: '',
  };
}

export default function WholesaleSales() {
  const toast = useToast();
  const { t } = useLanguage();

  const [range, setRange] = useState('today');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [brokenInfo, setBrokenInfo] = useState(null);
  const [goodAvailable, setGoodAvailable] = useState(null);

  const { data: todayData, refetch: todayRefetch } = useFetch(wholesaleApi.today);
  const { data: stockData } = useFetch(eggStockApi.latest);
  const { data, loading, error, refetch } = useFetch(
    wholesaleApi.getAll,
    { range, eggClass: classFilter, paymentStatus: statusFilter, search },
    { sales: [], summary: {} }
  );

  useEffect(() => {
    refetch({ range, eggClass: classFilter, paymentStatus: statusFilter, search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, classFilter, statusFilter, search]);

  useEffect(() => {
    setGoodAvailable(stockData?.availableToday ?? null);
  }, [stockData]);

  const sales = data?.sales || [];

  const summary = useMemo(() => {
    const s = {
      count: sales.length,
      brokenQty: 0,
      goodQty: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      buyers: new Set(),
    };
    sales.forEach((sale) => {
      if (sale.eggClass === 'Broken') s.brokenQty += Number(sale.eggQuantity) || 0;
      else s.goodQty += Number(sale.eggQuantity) || 0;
      s.totalAmount += Number(sale.totalAmount) || 0;
      s.paidAmount += Number(sale.paidAmount) || 0;
      s.pendingAmount += Number(sale.pendingAmount) || 0;
      if (sale.buyer) s.buyers.add(String(sale.buyer));
    });
    return s;
  }, [sales]);

  const knownFeeders = useMemo(() => {
    const set = new Set();
    sales.forEach((s) => s.buyer && set.add(String(s.buyer)));
    return Array.from(set).sort();
  }, [sales]);

  // Daily broken-egg record grouped by date (separate record for each day).
  const brokenDaily = useMemo(() => {
    const map = new Map();
    sales
      .filter((s) => s.eggClass === 'Broken')
      .forEach((s) => {
        const key = toDateInput(s.date) || s.date;
        const row = map.get(key) || { date: key, entries: 0, qty: 0, total: 0, paid: 0, pending: 0, buyers: new Set() };
        row.entries += 1;
        row.qty += Number(s.eggQuantity) || 0;
        row.total += Number(s.totalAmount) || 0;
        row.paid += Number(s.paidAmount) || 0;
        row.pending += Number(s.pendingAmount) || 0;
        if (s.buyer) row.buyers.add(String(s.buyer));
        map.set(key, row);
      });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [sales]);

  // Fetch broken availability for the selected date when the modal is relevant.
  useEffect(() => {
    if (!modal) return;
    let active = true;
    setBrokenInfo(null);
    wholesaleApi
      .brokenAvailable({ date: form.date })
      .then(({ data: res }) => active && setBrokenInfo(res))
      .catch(() => active && setBrokenInfo(null));
    return () => {
      active = false;
    };
  }, [modal, form.date]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const total = (Number(form.eggQuantity) || 0) * (Number(form.pricePerEgg) || 0);
  const pending = Math.max(0, total - (Number(form.paidAmount) || 0));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = (sale) => {
    setEditing(sale);
    setForm({
      date: toDateInput(sale.date),
      eggClass: sale.eggClass,
      buyer: sale.buyer,
      eggQuantity: sale.eggQuantity,
      pricePerEgg: sale.pricePerEgg,
      paidAmount: sale.paidAmount || 0,
      paymentMethod: sale.paymentMethod || 'Cash',
      notes: sale.notes || '',
    });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.buyer || !form.buyer.trim()) {
      toast.error(t('wholesale.validationBuyer'));
      return;
    }
    const qty = Number(form.eggQuantity);
    const price = Number(form.pricePerEgg);
    if (!qty || qty <= 0) {
      toast.error(t('wholesale.validationQty'));
      return;
    }
    if (price == null || Number.isNaN(price) || price < 0) {
      toast.error(t('wholesale.validationPrice'));
      return;
    }
    const payload = {
      date: form.date,
      eggClass: form.eggClass,
      buyer: form.buyer.trim(),
      eggQuantity: qty,
      pricePerEgg: price,
      paidAmount: Number(form.paidAmount) || 0,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
    };
    setSaving(true);
    try {
      if (editing) {
        await wholesaleApi.update(editing._id, payload);
        toast.success(t('wholesale.updated'));
      } else {
        await wholesaleApi.create(payload);
        toast.success(t('wholesale.created'));
      }
      setModal(false);
      refetch();
      todayRefetch();
    } catch (err) {
      toast.error(getErrorMessage(err, t('wholesale.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sale) => {
    try {
      await wholesaleApi.remove(sale._id);
      toast.success(t('wholesale.deleted'));
      refetch();
      todayRefetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const listed = (sale) => (
    <>
      <button className="btn-ghost !px-2" onClick={() => openEdit(sale)} title={t('common.edit')}>
        <Icon name="edit" className="h-4 w-4" />
      </button>
      <button className="btn-ghost !px-2 !text-red-600" onClick={() => setConfirm(sale)} title={t('common.delete')}>
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </>
  );

  const columns = [
    { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
    {
      key: 'eggClass',
      header: `${t('wholesale.eggClass')}`,
      render: (r) =>
        r.eggClass === 'Broken' ? (
          <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">{t('wholesale.broken')}</span>
        ) : (
          <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">{t('wholesale.good')}</span>
        ),
    },
    { key: 'buyer', header: t('wholesale.buyer'), render: (r) => <span className="font-semibold text-slate-900">{r.buyer || '-'}</span> },
    { key: 'eggQuantity', header: t('wholesale.eggs'), render: (r) => <span className="font-bold">{num(r.eggQuantity)}</span> },
    { key: 'pricePerEgg', header: t('wholesale.pricePerEgg'), render: (r) => `₹${Number(r.pricePerEgg).toFixed(2)}` },
    { key: 'totalAmount', header: t('common.total'), render: (r) => <span className="font-semibold">{inr(r.totalAmount)}</span> },
    { key: 'paidAmount', header: t('common.paid'), render: (r) => <span className="text-emerald-600">{inr(r.paidAmount)}</span> },
    {
      key: 'pendingAmount',
      header: t('common.pending'),
      render: (r) => <span className={r.pendingAmount > 0 ? 'font-bold text-red-600' : 'text-slate-400'}>{inr(r.pendingAmount)}</span>,
    },
    {
      key: 'paymentStatus',
      header: t('common.status'),
      render: (r) => (
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
            r.paymentStatus === 'PAID'
              ? 'bg-emerald-100 text-emerald-700'
              : r.paymentStatus === 'PARTIAL'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {t('status.' + r.paymentStatus) || r.paymentStatus}
        </span>
      ),
    },
    { key: 'paymentMethod', header: t('common.method'), render: (r) => (r.paymentMethod ? t(`sales.methods.${r.paymentMethod}`) : '-') },
  ];

  const brokenDailyColumns = [
    { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
    { key: 'entries', header: t('wholesale.entries'), render: (r) => num(r.entries) },
    { key: 'qty', header: t('wholesale.eggs'), render: (r) => <span className="font-bold">{num(r.qty)}</span> },
    { key: 'total', header: t('common.total'), render: (r) => <span className="font-semibold">{inr(r.total)}</span> },
    { key: 'paid', header: t('common.paid'), render: (r) => <span className="text-emerald-600">{inr(r.paid)}</span> },
    {
      key: 'pending',
      header: t('common.pending'),
      render: (r) => <span className={r.pending > 0 ? 'font-bold text-red-600' : 'text-slate-400'}>{inr(r.pending)}</span>,
    },
    { key: 'buyers', header: t('wholesale.buyers'), render: (r) => num(r.buyers.size) },
  ];

  return (
    <div>
      <PageHeader
        title={t('wholesale.title')}
        subtitle={t('wholesale.subtitle')}
        actions={[
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('wholesale.addSale')}
          </button>,
        ]}
      />

      <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryBox label={t('wholesale.todayBroken')} value={`${num(todayData?.today?.brokenQty || 0)}`} accent="amber" />
        <SummaryBox label={t('wholesale.todayGood')} value={num(todayData?.today?.goodQty || 0)} accent="green" />
        <SummaryBox label={t('wholesale.brokenAvailable')} value={num(todayData?.today?.brokenAvailable ?? 0)} accent={todayData?.today?.brokenAvailable <= 0 ? 'red' : ''} />
        <SummaryBox label={t('wholesale.received')} value={inr(todayData?.today?.received || 0)} accent="green" />
        <SummaryBox label={t('wholesale.revenueToday')} value={inr(todayData?.today?.revenue || 0)} />
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        {t('wholesale.brokenFromProduction', {
          produced: num(todayData?.today?.producedBroken ?? 0),
          sold: num(todayData?.today?.soldBroken ?? 0),
          available: num(todayData?.today?.brokenAvailable ?? 0),
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            className={`px-3 py-2 text-xs font-bold ${tab === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
            onClick={() => setTab('all')}
          >
            {t('wholesale.allSales')}
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-xs font-bold ${tab === 'brokendaily' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
            onClick={() => setTab('brokendaily')}
          >
            {t('wholesale.brokenDaily')}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">{t('common.today')}</option>
            <option value="yesterday">{t('common.yesterday')}</option>
            <option value="7">{t('common.last7')}</option>
            <option value="30">{t('common.last30')}</option>
            <option value="month">{t('common.month')}</option>
            <option value="year">{t('common.year')}</option>
          </select>
          <select className="input !w-auto" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">{t('wholesale.allClasses')}</option>
            <option value="Good">{t('wholesale.good')}</option>
            <option value="Broken">{t('wholesale.broken')}</option>
          </select>
          <select className="input !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t('sales.allStatuses')}</option>
            <option value="PAID">{t('status.PAID')}</option>
            <option value="PARTIAL">{t('status.PARTIAL')}</option>
            <option value="PENDING">{t('status.PENDING')}</option>
          </select>
        </div>
        <div className="relative ml-auto">
          <Icon name="search" className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input !pl-8 !w-48" placeholder={t('wholesale.searchBuyer')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      {tab === 'all' ? (
        <DataTable
          columns={columns}
          rows={loading ? [] : sales}
          loading={loading}
          emptyTitle={t('wholesale.noRecords')}
          emptyHint={t('wholesale.noRecordsHint')}
          actions={listed}
        />
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">{t('wholesale.dailyBrokenTitle')}</h3>
              <p className="text-xs text-slate-500">{t('wholesale.dailyHint')}</p>
            </div>
            <SummaryBox label={t('wholesale.totalBrokenCell')} value={num(brokenDaily.reduce((a, r) => a + r.qty, 0))} accent="amber" />
          </div>
          <DataTable
            columns={brokenDailyColumns}
            rows={loading ? [] : brokenDaily}
            loading={loading}
            emptyTitle={t('wholesale.noBrokenDaily')}
            emptyHint={t('wholesale.noRecordsHint')}
          />
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('wholesale.editTitle') : t('wholesale.createTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('common.date')}>
              <input className="input" type="date" value={form.date} onChange={setField('date')} />
            </Field>
            <Field label={t('wholesale.eggClass')}>
              <select className="input" value={form.eggClass} onChange={setField('eggClass')}>
                <option value="Broken">{t('wholesale.broken')}</option>
                <option value="Good">{t('wholesale.good')}</option>
              </select>
            </Field>
          </div>

          <Field label={`${t('wholesale.buyer')} *`}>
            <input className="input" list="feeder-list" placeholder={t('wholesale.buyerPh')} value={form.buyer} onChange={setField('buyer')} />
            <datalist id="feeder-list">
              {knownFeeders.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={`${t('wholesale.eggs')} *`}>
              <input className="input" type="number" min="0" step="1" value={form.eggQuantity} onChange={setField('eggQuantity')} placeholder="0" />
            </Field>
            <Field label={`${t('wholesale.pricePerEgg')} *`}>
              <input className="input" type="number" min="0" step="0.01" value={form.pricePerEgg} onChange={setField('pricePerEgg')} placeholder="0.00" />
            </Field>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-800">{t('common.total')}</span>
              <span className="text-xl font-bold text-emerald-800">{inr(total)}</span>
            </div>
            <p className="text-xs text-emerald-600">
              {form.eggClass === 'Broken'
                ? t('wholesale.availabilityBroken', {
                    produced: num(brokenInfo?.producedBroken ?? 0),
                    sold: num(brokenInfo?.soldBroken ?? 0),
                    available: num(brokenInfo?.available ?? 0),
                  })
                : t('wholesale.availabilityGood', { eggs: num(goodAvailable ?? 0) })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('wholesale.amountPaid')}>
              <input className="input" type="number" step="0.01" min="0" value={form.paidAmount} onChange={setField('paidAmount')} placeholder="0" />
            </Field>
            <Field label={t('common.method')}>
              <select className="input" value={form.paymentMethod} onChange={setField('paymentMethod')}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{t(`sales.methods.${m}`)}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-600">
            {t('wholesale.pendingRow', { amount: inr(pending) })}
          </div>

          <Field label={t('common.notes')}>
            <input className="input" value={form.notes} onChange={setField('notes')} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('wholesale.saveSale')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title={t('wholesale.deleteTitle')}
        message={t('wholesale.deleteMsg')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}

function SummaryBox({ label, value, accent = '' }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-emerald-600' : accent === 'amber' ? 'text-amber-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}