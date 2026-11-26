import { useEffect, useState } from 'react';
import { eggStockApi } from '../api';
import { getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/Spinner';
import { num, fmtDate } from '../utils/format';
import Field from '../components/Field';

export default function EggStockPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const [range, setRange] = useState('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tick, setTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [adjust, setAdjust] = useState({ date: '', amount: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [latest, setLatest] = useState(null);

  const params = { range, from, to };

  const { data, loading, error, refetch } = useFetch(eggStockApi.getAll, params, { records: [] });

  useEffect(() => {
    refetch({ range, from, to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    eggStockApi
      .latest()
      .then(({ data: d }) => setLatest(d))
      .catch(() => setLatest(null));
  }, [data]);

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjust.date || !adjust.reason) {
      toast.error(t('eggstock.validationReq'));
      return;
    }
    const amount = Number(adjust.amount);
    if (!amount || Number.isNaN(amount)) {
      toast.error(t('eggstock.validationNum'));
      return;
    }
    setSaving(true);
    try {
      await eggStockApi.adjust({ date: adjust.date, amount, reason: adjust.reason });
      toast.success(t('eggstock.adjusted'));
      setModalOpen(false);
      setAdjust({ date: '', amount: '', reason: '' });
      setTick((t) => t + 1);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, t('eggstock.adjustError')));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'date', header: t('eggstock.date'), render: (r) => fmtDate(r.date) },
    { key: 'openingStock', header: t('eggstock.opening'), render: (r) => num(r.openingStock) },
    { key: 'production', header: t('eggstock.production'), render: (r) => <span className="text-emerald-600">+{num(r.production)}</span> },
    { key: 'sold', header: t('eggstock.sold'), render: (r) => <span className="text-amber-600">-{num(r.sold)}</span> },
    { key: 'broken', header: t('eggstock.broken'), render: (r) => <span className="text-red-500">-{num(r.broken)}</span> },
    { key: 'rejected', header: t('eggstock.rejected'), render: (r) => <span className="text-red-400">-{num(r.rejected)}</span> },
    {
      key: 'adjustments',
      header: t('eggstock.adjustments'),
      render: (r) => (
        <span className={r.adjustments > 0 ? 'text-sky-600 font-medium' : 'text-slate-500'}>
          {r.adjustments ? (r.adjustments > 0 ? `+${num(r.adjustments)}` : num(r.adjustments)) : '0'}
        </span>
      ),
    },
    {
      key: 'closingStock',
      header: t('eggstock.closing'),
      render: (r) => <span className="font-bold text-brand-700">{num(r.closingStock)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('eggstock.title')}
        subtitle={t('eggstock.formula')}
        actions={[
          <button key="adjust" className="btn-secondary" onClick={() => setModalOpen(true)}>
            <Icon name="edit" className="h-4 w-4" /> {t('eggstock.addAdjustment')}
          </button>,
        ]}
      />

      {latest?.stock && (
        <div className="mb-4 card p-4 flex flex-wrap gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('eggstock.latestRemaining')}</p>
            <p className="text-2xl font-bold text-slate-900">{num(latest.stock.closingStock)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('eggstock.availableToday')}</p>
            <p className="text-2xl font-bold text-emerald-600">{num(latest.availableToday)}</p>
          </div>
          {latest?.stock?.adjustmentReason && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('eggstock.lastAdjustment')}</p>
              <p className="mt-1 text-sm text-slate-600">{latest.stock.adjustmentReason}</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <select
          className="input !w-auto"
          value={range}
          onChange={(e) => {
            setRange(e.target.value);
            setTick((t) => t + 1);
          }}
        >
          <option value="today">{t('common.today')}</option>
          <option value="7">{t('common.last7')}</option>
          <option value="30">{t('common.last30')}</option>
          <option value="month">{t('common.month')}</option>
          <option value="year">{t('common.year')}</option>
          <option value="custom">{t('common.custom')}</option>
        </select>
        {range === 'custom' && (
          <>
            <input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        )}
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : (data?.records || [])}
        loading={loading}
        emptyTitle={t('eggstock.noRecords')}
        emptyHint={t('eggstock.noRecordsHint')}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('eggstock.adjustTitle')}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <Field label={`${t('eggstock.date')} *`}>
            <input className="input" type="date" value={adjust.date} onChange={(e) => setAdjust((a) => ({ ...a, date: e.target.value }))} required />
          </Field>
          <Field label={`${t('eggstock.adjustAmount')} *`}>
            <input className="input" type="number" step="1" value={adjust.amount} onChange={(e) => setAdjust((a) => ({ ...a, amount: e.target.value }))} placeholder="-10 / +25" required />
          </Field>
          <Field label={`${t('eggstock.reason')} *`}>
            <input className="input" value={adjust.reason} onChange={(e) => setAdjust((a) => ({ ...a, reason: e.target.value }))} required />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('eggstock.adjusting') : t('eggstock.applyAdjustment')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}