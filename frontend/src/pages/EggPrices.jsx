import { useEffect, useState } from 'react';
import { eggPriceApi } from '../api';
import { getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/Spinner';
import { num, fmtDate, fmtDateTime, toDateInput } from '../utils/format';
import Field from '../components/Field';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const sourceBadge = {
  API: 'bg-emerald-100 text-emerald-700',
  LAST_KNOWN: 'bg-amber-100 text-amber-700',
  MANUAL: 'bg-sky-100 text-sky-700',
  NONE: 'bg-slate-200 text-slate-700',
};

export default function EggPrices() {
  const toast = useToast();
  const { t } = useLanguage();
  const [range, setRange] = useState('30');
  const [modalOpen, setModalOpen] = useState(false);
  const [manual, setManual] = useState({ date: toDateInput(new Date()), pricePerEgg: '', localSellingPrice: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [current, setCurrent] = useState(null);

  const { data, loading, error, refetch } = useFetch(eggPriceApi.getAll, { range }, { prices: [] });

  useEffect(() => {
    loadCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const loadCurrent = async () => {
    try {
      const { data: d } = await eggPriceApi.current();
      setCurrent(d);
    } catch {
      setCurrent(null);
    }
  };

  const sourceLabel = (src) => {
    if (src === 'LAST_KNOWN') return t('dashboard.lastKnownPrice');
    if (src === 'API') return t('dashboard.liveApiPrice');
    if (src === 'MANUAL') return t('dashboard.manualPrice');
    return t('dashboard.noPrice');
  };

  const handleManualSave = async (e) => {
    e.preventDefault();
    if (manual.pricePerEgg === '' || Number(manual.pricePerEgg) < 0) {
      toast.error(t('eggprices.validation'));
      return;
    }
    setSaving(true);
    try {
      await eggPriceApi.create(manual);
      toast.success(t('eggprices.saved'));
      setModalOpen(false);
      setManual({ date: toDateInput(new Date()), pricePerEgg: '', localSellingPrice: '', notes: '' });
      refetch();
      await loadCurrent();
    } catch (err) {
      toast.error(getErrorMessage(err, t('eggprices.refreshFail')));
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: d } = await eggPriceApi.refresh();
      setCurrent(d);
      if (d.apiError) toast.info(d.apiError);
      toast.success(t('eggprices.refreshToastSource', { source: d.source }));
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, t('eggprices.refreshFail')));
    } finally {
      setRefreshing(false);
    }
  };

  const chartData = (data?.prices || []).map((p) => ({ date: p.date?.slice(0, 10), price: p.pricePerEgg }));

  const columns = [
    { key: 'date', header: t('eggprices.date'), render: (r) => fmtDate(r.date) },
    {
      key: 'pricePerEgg',
      header: t('eggprices.pricePerEgg'),
      render: (r) => <span className="font-bold">₹{Number(r.pricePerEgg).toFixed(2)}</span>,
    },
    {
      key: 'localSellingPrice',
      header: t('eggprices.localPrice'),
      render: (r) => (r.localSellingPrice ? `₹${Number(r.localSellingPrice).toFixed(2)}` : '-'),
    },
    {
      key: 'source',
      header: t('eggprices.source'),
      render: (r) => <span className={`badge ${sourceBadge[r.source] || sourceBadge.NONE}`}>{sourceLabel(r.source)}</span>,
    },
    { key: 'location', header: t('reports.location'), render: (r) => r.location || 'Namakkal' },
    { key: 'updatedAt', header: t('eggprices.updated'), render: (r) => fmtDateTime(r.updatedAt) },
    { key: 'notes', header: t('common.notes'), render: (r) => r.notes || '-' },
  ];

  return (
    <div>
      <PageHeader
        title={t('eggprices.title')}
        subtitle={t('eggprices.subtitle')}
        actions={[
          <button key="refresh" className="btn-secondary" onClick={handleRefresh} disabled={refreshing}>
            <Icon name="chart" className="h-4 w-4" /> {refreshing ? t('eggprices.refreshing') : t('eggprices.checkPrice')}
          </button>,
          <button key="manual" className="btn-primary" onClick={() => setModalOpen(true)}>
            <Icon name="plus" className="h-4 w-4" /> {t('eggprices.setManual')}
          </button>,
        ]}
      />

      <div className="mb-4 card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('eggprices.todaysPrice')}</p>
            <p className="text-3xl font-bold text-slate-900">
              ₹{current?.price != null ? Number(current.price).toFixed(2) : '--'}
              <span className="text-sm font-semibold text-slate-400">{t('eggprices.perEgg')}</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('eggprices.source')}</p>
            <span className={`badge ${sourceBadge[current?.source] || sourceBadge.NONE}`}>{sourceLabel(current?.source)}</span>
            <p className="mt-1 text-xs text-slate-500">{t('dashboard.updated', { date: current?.updated ? fmtDateTime(current.updated) : '-' })}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('eggprices.localSellingDefault')}</p>
            <p className="text-xl font-bold text-emerald-600">₹{Number(current?.localSellingPrice || 0).toFixed(2)}{t('eggprices.perEgg')}</p>
          </div>
        </div>
        {current?.notes && (
          <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">{current.notes}</p>
        )}
        {current?.apiError && (
          <p className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {t('eggprices.apiErrorBanner', { msg: current.apiError })}
          </p>
        )}
      </div>

      <div className="card p-4 mb-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3">{t('eggprices.priceHistory')}</h3>
        {chartData.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(v) => [`₹${Number(v).toFixed(2)}`, t('common.price')]} />
              <Line type="monotone" dataKey="price" stroke="#e99d1d" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-slate-400">{t('eggprices.noHistory')}</p>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <select className="input !w-auto" value={range} onChange={(e) => { setRange(e.target.value); refetch({ range: e.target.value }); }}>
          <option value="7">{t('common.last7')}</option>
          <option value="30">{t('common.last30')}</option>
          <option value="month">{t('common.month')}</option>
          <option value="year">{t('common.year')}</option>
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : (data?.prices || [])}
        loading={loading}
        emptyTitle={t('eggprices.noRecords')}
        emptyHint={t('eggprices.noRecordsHint')}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('eggprices.setManually')}>
        <form onSubmit={handleManualSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('eggprices.date')}>
              <input className="input" type="date" value={manual.date} onChange={(e) => setManual((m) => ({ ...m, date: e.target.value }))} />
            </Field>
            <Field label={t('eggprices.pricePerEggLabel')}>
              <input className="input" type="number" step="0.01" min="0" value={manual.pricePerEgg} onChange={(e) => setManual((m) => ({ ...m, pricePerEgg: e.target.value }))} placeholder="e.g. 5.20" required />
            </Field>
            <Field label={t('eggprices.localSellingLabel')} hint={t('eggprices.localSellingHint')}>
              <input className="input" type="number" step="0.01" min="0" value={manual.localSellingPrice} onChange={(e) => setManual((m) => ({ ...m, localSellingPrice: e.target.value }))} placeholder="e.g. 5.50" />
            </Field>
          </div>
          <Field label={t('common.notes')}>
            <textarea className="input" rows="2" value={manual.notes} onChange={(e) => setManual((m) => ({ ...m, notes: e.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('eggprices.savePrice')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}