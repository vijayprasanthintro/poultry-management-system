import { useEffect, useState } from 'react';
import { reportsApi, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import DateRangeSelect from '../components/DateRangeSelect';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/Spinner';
import { Badge } from '../components/Badge';
import { num, inr, inrFixed, fmtDate, toURLObj } from '../utils/format';

export default function Reports() {
  const toast = useToast();
  const { t } = useLanguage();
  const [type, setType] = useState('summary');
  const [range, setRange] = useState('7');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const TABS = [
    { id: 'summary', label: t('reports.summary'), exportable: false },
    { id: 'production', label: t('reports.production'), exportable: true },
    { id: 'sales', label: t('reports.sales'), exportable: true },
    { id: 'feedUsage', label: t('reports.feedUsage'), exportable: true },
    { id: 'expenses', label: t('reports.expenses'), exportable: true },
    { id: 'profit', label: t('reports.revenueProfit'), exportable: false },
    { id: 'stock', label: t('reports.stock'), exportable: true },
    { id: 'prices', label: t('reports.marketPrices'), exportable: false },
    { id: 'customerPayments', label: t('reports.customerPayments'), exportable: false },
  ];

  const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: summaryRefetch } = useFetch(
    reportsApi.summary,
    toURLObj({ range, from, to })
  );
  const { data: tabData, loading: tabLoading, error: tabError, refetch: tabRefetch } = useFetch(
    reportsApi.data,
    toURLObj({ type, range, from, to }),
    { rows: [] }
  );

  useEffect(() => {
    summaryRefetch(toURLObj({ range, from, to }));
    tabRefetch(toURLObj({ type, range, from, to }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, range, from, to]);

  const handleTypeChange = (tt) => {
    setType(tt);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = toURLObj({ type, range, from, to });
      const res = await reportsApi.exportCsv(params);
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${type}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('reports.downloaded'));
    } catch (err) {
      toast.error(getErrorMessage(err, t('reports.exportFailed')));
    } finally {
      setExporting(false);
    }
  };

  const cards = summaryData?.cards || {};
  const profitRows = tabData?.summary?.cards || cards;

  const renderSummary = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label={t('dashboard.totalHens')} value={num(cards.totalHens)} icon={<Icon name="bird" className="h-5 w-5" />} loading={summaryLoading} />
      <StatCard label={t('reports.eggsProduced')} value={num(cards.totalEggs)} icon={<Icon name="egg" className="h-5 w-5" />} loading={summaryLoading} />
      <StatCard label={t('eggs.sellable')} value={num(cards.sellableEggs)} icon={<Icon name="egg" className="h-5 w-5" />} loading={summaryLoading} accent="green" />
      <StatCard label={t('reports.eggsSold')} value={num(cards.eggsSold)} icon={<Icon name="sale" className="h-5 w-5" />} loading={summaryLoading} accent="blue" />
      <StatCard label={t('reports.eggsRemaining')} value={num(cards.remainingEggs)} icon={<Icon name="stock" className="h-5 w-5" />} loading={summaryLoading} accent="amber" />
      <StatCard label={t('reports.feedUsedKg')} value={num(cards.feedUsed, 1)} icon={<Icon name="feed" className="h-5 w-5" />} loading={summaryLoading} accent="amber" />
      <StatCard label={t('reports.feedRemainingKg')} value={num(cards.feedRemaining, 1)} icon={<Icon name="feed" className="h-5 w-5" />} loading={summaryLoading} accent="violet" />
      <StatCard label={t('reports.salesRevenue')} value={inr(cards.salesRevenue)} icon={<Icon name="sale" className="h-5 w-5" />} loading={summaryLoading} accent="green" />
      <StatCard label={t('dashboard.amountReceived')} value={inr(cards.amountReceived)} icon={<Icon name="payment" className="h-5 w-5" />} loading={summaryLoading} accent="blue" />
      <StatCard label={t('dashboard.pendingAmount')} value={inr(cards.pendingAmount)} icon={<Icon name="payment" className="h-5 w-5" />} loading={summaryLoading} accent={cards.pendingAmount > 0 ? 'red' : 'green'} />
      <StatCard label={t('reports.cashExpenses')} value={inr(cards.expensesAmount)} icon={<Icon name="expense" className="h-5 w-5" />} loading={summaryLoading} accent="red" />
      <StatCard label={t('reports.feedCost')} value={inr(cards.feedCost)} icon={<Icon name="feed" className="h-5 w-5" />} loading={summaryLoading} accent="red" />
      <StatCard label={t('reports.totalCost')} value={inr(cards.totalExpenses)} icon={<Icon name="expense" className="h-5 w-5" />} loading={summaryLoading} accent="red" />
      <StatCard label={t('reports.netProfit')} value={inr(cards.netProfit)} icon={<Icon name="report" className="h-5 w-5" />} loading={summaryLoading} accent={cards.netProfit >= 0 ? 'green' : 'red'} />
      <StatCard label={t('reports.profitMargin')} value={`${num(cards.profitMargin)}%`} icon={<Icon name="chart" className="h-5 w-5" />} loading={summaryLoading} accent="violet" />
      <StatCard label={t('reports.productionRate')} value={`${num(cards.productionRate)}%`} icon={<Icon name="chart" className="h-5 w-5" />} loading={summaryLoading} accent="amber" />
      <StatCard label={t('reports.avgEggsPerHen')} value={num(cards.avgEggsPerHen, 2)} icon={<Icon name="egg" className="h-5 w-5" />} loading={summaryLoading} />
      <StatCard label={t('reports.costPerEgg')} value={inrFixed(cards.costPerEgg)} icon={<Icon name="expense" className="h-5 w-5" />} loading={summaryLoading} accent="red" />
      <StatCard label={t('reports.revenuePerEgg')} value={inrFixed(cards.revenuePerEgg)} icon={<Icon name="sale" className="h-5 w-5" />} loading={summaryLoading} accent="green" />
      <StatCard label={t('reports.profitPerEgg')} value={inrFixed(cards.profitPerEgg)} icon={<Icon name="report" className="h-5 w-5" />} loading={summaryLoading} accent={cards.profitPerEgg >= 0 ? 'green' : 'red'} />
    </div>
  );

  const renderProfit = () => (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label={t('reports.revenue')} value={inr(profitRows.salesRevenue)} icon={<Icon name="sale" className="h-5 w-5" />} accent="green" />
        <StatCard label={t('reports.received')} value={inr(profitRows.amountReceived)} icon={<Icon name="payment" className="h-5 w-5" />} accent="blue" />
        <StatCard label={t('reports.pending')} value={inr(profitRows.pendingAmount)} icon={<Icon name="payment" className="h-5 w-5" />} accent="amber" />
        <StatCard label={t('reports.cashExpenses')} value={inr(profitRows.expensesAmount)} icon={<Icon name="expense" className="h-5 w-5" />} accent="red" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label={t('reports.feedCost')} value={inr(profitRows.feedCost)} icon={<Icon name="feed" className="h-5 w-5" />} accent="red" />
        <StatCard label={t('reports.totalCost')} value={inr(profitRows.totalExpenses)} icon={<Icon name="expense" className="h-5 w-5" />} accent="red" />
        <StatCard label={t('reports.netProfit')} value={inr(profitRows.netProfit)} icon={<Icon name="report" className="h-5 w-5" />} accent={profitRows.netProfit >= 0 ? 'green' : 'red'} />
        <StatCard label={t('reports.profitMargin')} value={`${num(profitRows.profitMargin)}%`} icon={<Icon name="chart" className="h-5 w-5" />} accent="violet" />
        <StatCard label={t('reports.costPerEgg')} value={inrFixed(profitRows.costPerEgg)} icon={<Icon name="expense" className="h-5 w-5" />} accent="red" />
        <StatCard label={t('reports.profitPerEgg')} value={inrFixed(profitRows.profitPerEgg)} icon={<Icon name="report" className="h-5 w-5" />} accent={profitRows.profitPerEgg >= 0 ? 'green' : 'red'} />
      </div>
    </div>
  );

  const renderTable = () => {
    const { cols, summary } = tableSpec(type, t);
    const rows = tabData?.rows || [];
    const tabSummary = tabData?.summary;
    return (
      <div>
        {summary && tabSummary && (
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {summary.map((s) => (
              <div key={s.label} className="card p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">{s.render(tabSummary)}</p>
              </div>
            ))}
          </div>
        )}
        <DataTable columns={cols} rows={rows} loading={tabLoading} emptyTitle={t('reports.noData')} emptyHint={t('reports.noDataHint')} />
      </div>
    );
  };

  const activeTab = TABS.find((tb) => tb.id === type) || TABS[0];
  const error = type === 'summary' ? summaryError : tabError;
  const loading = type === 'summary' ? summaryLoading : tabLoading;

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={[
          activeTab.exportable && (
            <button key="export" className="btn-secondary" onClick={handleExport} disabled={exporting}>
              <Icon name="download" className="h-4 w-4" /> {exporting ? t('reports.exporting') : t('reports.downloadCsv')}
            </button>
          ),
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DateRangeSelect
          value={range}
          onChange={(p) => {
            if (p.range !== undefined) {
              setRange(p.range);
              if (p.range !== 'custom') {
                setFrom('');
                setTo('');
              }
            }
            if (p.from !== undefined) setFrom(p.from);
            if (p.to !== undefined) setTo(p.to);
          }}
          from={from}
          to={to}
        />
      </div>

      <div className="mb-5 -mx-1 px-1 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => handleTypeChange(tb.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition whitespace-nowrap ${
                type === tb.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={() => (type === 'summary' ? summaryRefetch() : tabRefetch())} />}
      {loading && !error && <LoadingHint />}
      {!error && type === 'summary' && renderSummary()}
      {!error && type === 'profit' && renderProfit()}
      {!error && type !== 'summary' && type !== 'profit' && renderTable()}
      <div className="mt-6 text-center text-[11px] text-slate-400">
        {t('reports.rangeDisplay', { range: summaryData?.range || range })} · {t('reports.timeNote')}
      </div>
    </div>
  );
}

function LoadingHint() {
  return (
    <div className="card p-4">
      <div className="my-2 h-10 animate-pulse rounded-lg bg-slate-100" />
      <div className="my-2 h-10 animate-pulse rounded-lg bg-slate-100" />
      <div className="my-2 h-10 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

function tableSpec(type, t) {
  switch (type) {
    case 'production':
      return {
        cols: [
          { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
          { key: 'set', header: t('reports.set'), render: (r) => r.set?.name || '-' },
          { key: 'birds', header: t('reports.birds'), render: (r) => num(r.birds) },
          { key: 'singleEggs', header: t('reports.single'), render: (r) => num(r.singleEggs) },
          { key: 'doubleEggs', header: t('reports.double'), render: (r) => <span className="text-violet-600">{num(r.doubleEggs)}</span> },
          { key: 'totalEggs', header: t('reports.totalEggs'), render: (r) => <span className="font-bold">{num(r.totalEggs)}</span> },
          { key: 'brokenEggs', header: t('reports.broken'), render: (r) => <span className="text-red-600">{num(r.brokenEggs)}</span> },
          { key: 'rejectedEggs', header: t('reports.rejected'), render: (r) => num(r.rejectedEggs) },
          { key: 'sellableEggs', header: t('reports.sellable'), render: (r) => <span className="font-semibold text-emerald-600">{num(r.sellableEggs)}</span> },
          { key: 'notes', header: t('reports.notes'), render: (r) => r.notes || '-' },
        ],
        summary: null,
      };
    case 'sales':
      return {
        cols: [
          { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
          { key: 'customer', header: t('reports.customerName'), render: (r) => r.customer?.name || t('reports.unknown') },
          { key: 'singleEggQuantity', header: t('reports.single'), render: (r) => num(r.singleEggQuantity) },
          { key: 'doubleEggQuantity', header: t('reports.double'), render: (r) => <span className="text-violet-600">{num(r.doubleEggQuantity)}</span> },
          { key: 'eggQuantity', header: t('reports.eggsSold'), render: (r) => <span className="font-bold">{num(r.eggQuantity)}</span> },
          { key: 'singleEggPrice', header: t('reports.singlePrice'), render: (r) => inrFixed(r.singleEggPrice) },
          { key: 'doubleEggPrice', header: t('reports.doublePrice'), render: (r) => inrFixed(r.doubleEggPrice) },
          { key: 'totalAmount', header: t('reports.total'), render: (r) => <span className="font-semibold">{inr(r.totalAmount)}</span> },
          { key: 'paidAmount', header: t('reports.paid'), render: (r) => <span className="text-emerald-600">{inr(r.paidAmount)}</span> },
          { key: 'pendingAmount', header: t('reports.pending'), render: (r) => <span className={r.pendingAmount > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}>{inr(r.pendingAmount)}</span> },
          { key: 'paymentStatus', header: t('reports.status'), render: (r) => <Badge>{r.paymentStatus}</Badge> },
        ],
        summary: [
          { label: t('reports.customers'), render: (s) => num(s.customerCount) },
          { label: t('reports.singleSold'), render: (s) => num(s.singleEggs) },
          { label: t('reports.doubleSold'), render: (s) => num(s.doubleEggs) },
          { label: t('reports.eggsSold'), render: (s) => num(s.eggsSold) },
          { label: t('reports.revenue'), render: (s) => inr(s.totalRevenue) },
          { label: t('reports.received'), render: (s) => inr(s.amountReceived) },
          { label: t('reports.pending'), render: (s) => inr(s.pendingAmount) },
          { label: t('reports.avgPrice'), render: (s) => inrFixed(s.avgSellingPrice) },
        ],
      };
    case 'feedUsage':
      return {
        cols: [
          { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
          { key: 'set', header: t('reports.set'), render: (r) => r.set?.name || '-' },
          { key: 'feedName', header: t('reports.feed'), render: (r) => r.feedName || r.feed?.name || '-' },
          { key: 'startingWeight', header: t('reports.startKg'), render: (r) => num(r.startingWeight, 2) },
          { key: 'feedAdded', header: t('reports.addedKg'), render: (r) => num(r.feedAdded, 2) },
          { key: 'feedUsed', header: t('reports.usedKg'), render: (r) => <span className="font-semibold">{num(r.feedUsed, 2)}</span> },
          { key: 'endingWeight', header: t('reports.endKg'), render: (r) => num(r.endingWeight, 2) },
          { key: 'feedCost', header: t('reports.feedCost'), render: (r) => inr(r.feedCost) },
          { key: 'kind', header: t('reports.type'), render: (r) => (r.isAdjustment ? <Badge className="bg-sky-100 text-sky-700">{t('reports.adjust')}</Badge> : <Badge className="bg-emerald-100 text-emerald-700">{t('reports.usage')}</Badge>) },
        ],
        summary: [
          { label: t('reports.usedKg'), render: (s) => num(s.used, 2) },
          { label: t('reports.feedCost'), render: (s) => inr(s.cost) },
        ],
      };
    case 'expenses':
      return {
        cols: [
          { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
          { key: 'category', header: t('reports.category'), render: (r) => <Badge className="bg-orange-100 text-orange-700">{t('expcat.' + (r.category || 'Other'))}</Badge> },
          { key: 'description', header: t('reports.description'), render: (r) => r.description || '-' },
          { key: 'set', header: t('reports.set'), render: (r) => r.set?.name || '-' },
          { key: 'amount', header: t('reports.total'), render: (r) => <span className="font-bold text-red-600">{inr(r.amount)}</span> },
          { key: 'supplier', header: t('reports.supplier'), render: (r) => r.supplier || '-' },
        ],
        summary: [
          { label: t('reports.cashExpenses'), render: (s) => inr(s.expenses) },
          { label: t('reports.feedCost'), render: (s) => inr(s.feedCost) },
          { label: t('reports.total'), render: (s) => inr(s.total) },
        ],
      };
    case 'stock':
      return {
        cols: [
          { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
          { key: 'openingStock', header: t('reports.opening'), render: (r) => num(r.openingStock) },
          { key: 'production', header: t('reports.production'), render: (r) => num(r.production) },
          { key: 'sold', header: t('reports.sold'), render: (r) => num(r.sold) },
          { key: 'broken', header: t('reports.broken'), render: (r) => num(r.broken) },
          { key: 'rejected', header: t('reports.rejected'), render: (r) => num(r.rejected) },
          { key: 'adjustments', header: t('reports.adjustments'), render: (r) => num(r.adjustments) },
          { key: 'closingStock', header: t('reports.closing'), render: (r) => <span className="font-bold text-emerald-600">{num(r.closingStock)}</span> },
        ],
        summary: null,
      };
    case 'prices':
      return {
        cols: [
          { key: 'date', header: t('common.date'), render: (r) => fmtDate(r.date) },
          { key: 'pricePerEgg', header: t('reports.pricePerEgg'), render: (r) => <span className="font-bold">{inrFixed(r.pricePerEgg)}</span> },
          { key: 'source', header: t('reports.source'), render: (r) => <Badge className="bg-indigo-100 text-indigo-700">{r.source}</Badge> },
          { key: 'location', header: t('reports.location'), render: (r) => r.location || '-' },
        ],
        summary: [
          { label: t('reports.avgPriceShort'), render: (s) => inrFixed(s.avgPrice) },
          { label: t('reports.daysTracked'), render: (s) => num(s.count) },
        ],
      };
    case 'customerPayments':
      return {
        cols: [
          { key: 'paymentDate', header: t('common.date'), render: (r) => fmtDate(r.paymentDate) },
          { key: 'customer', header: t('reports.customerName'), render: (r) => r.customer?.name || t('reports.unknown') },
          { key: 'amount', header: t('reports.total'), render: (r) => <span className="font-bold text-emerald-600">{inr(r.amount)}</span> },
          { key: 'sale', header: t('reports.forSale'), render: (r) => (r.sale ? inr(r.sale.totalAmount) : '-') },
          { key: 'paymentMethod', header: t('reports.method'), render: (r) => t('sales.methods.' + (r.paymentMethod || 'Other')) },
        ],
        summary: [
          { label: t('reports.totalCollected'), render: (s) => inr(s.total) },
          { label: t('reports.paymentsCount'), render: (s) => num(s.count) },
        ],
      };
    default:
      return { cols: [], summary: null };
  }
}