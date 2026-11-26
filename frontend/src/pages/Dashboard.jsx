import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../i18n/LanguageContext';
import useFetch from '../hooks/useFetch';
import DateRangeSelect from '../components/DateRangeSelect';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import { LoadingBox, ErrorBox } from '../components/Spinner';
import { inr, num, fmtDate, fmtDateTime } from '../utils/format';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const sourceBadge = {
  API: 'bg-emerald-100 text-emerald-700',
  LAST_KNOWN: 'bg-amber-100 text-amber-700',
  MANUAL: 'bg-sky-100 text-sky-700',
  NONE: 'bg-slate-200 text-slate-700',
};

export default function Dashboard() {
  const { settings } = useSettings();
  const { t } = useLanguage();
  const [range, setRange] = useState('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tick, setTick] = useState(0);

  const params = { range };
  if (range === 'custom') {
    params.from = from;
    params.to = to;
  }

  const { data, loading, error, refetch } = useFetch(dashboardApi.get, params, null);

  const handleRangeChange = useCallback(
    (next) => {
      if (next.range) {
        setRange(next.range);
        if (next.range === 'custom') {
          setFrom((f) => f || new Date().toISOString().slice(0, 10));
          setTo((t) => t || new Date().toISOString().slice(0, 10));
        }
      } else if (next.from !== undefined) setFrom(next.from);
      else if (next.to !== undefined) setTo(next.to);
      setTick((t) => t + 1);
    },
    []
  );

  // Refetch when params change (hook handles it via params stringify)
  useEffect(() => {
    const { from: f, to: t, range: r } = params;
    refetch({ range: r, from: f, to: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const cards = data?.cards;

  const productionChart = [
    ...(data?.charts?.eggProduction || []).map((d) => ({
      date: d.date.slice(5),
      'Total Eggs': d.total,
      'Single': Number(d.single) || 0,
      'Double': Number(d.double) || 0,
      'Broken': Number(d.broken) || 0,
      'Sellable Eggs': d.sellable,
      ...Object.fromEntries(Object.entries(d.sets || {}).map(([k, v]) => [`${k}`, v])),
    })),
  ].reverse();

  const salesChart = (data?.charts?.localSales || []).map((d) => ({ date: d.date.slice(5), ...d }));
  const expenseChart = (data?.charts?.expenses || []).map((d) => ({ date: d.date.slice(5), ...d }));
  const feedChart = (data?.charts?.feedUsage || []).map((d) => ({ date: d.date.slice(5), ...d }));
  const labourTrendChart = (data?.charts?.labourExpenses || []).map((d) => ({ date: d.date.slice(5), ...d }));

  const labourBreakdownChart = (data?.charts?.labourBreakdown || []).map((d) => ({
    name: t('labexp.categories.' + (d.category || 'Other')),
    value: d.amount,
  }));

  const mortalityChart = (data?.charts?.mortality || []).map((d) => ({
    date: d.date.slice(5),
    deadHens: Number(d.deadHens) || 0,
  }));

  const recentMortalityRows = cards?.recentMortality || [];

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <DateRangeSelect
            value={range}
            from={from}
            to={to}
            onChange={handleRangeChange}
          />
        }
      />

      {!loading && error && <ErrorBox message={error} onRetry={() => refetch()} />}

      {!loading && cards?.highMortality && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="text-lg leading-none text-red-500">⚠️</span>
          <div>
            <p className="font-semibold">
              {t('settings.highMortalityAlert', {
                today: num(cards?.todayDeadHens),
                threshold: num(cards?.mortalityAlertThreshold),
              })}
            </p>
            <Link
              to="/dead-hens"
              className="mt-1 inline-block text-xs font-semibold text-red-600 underline underline-offset-2 hover:text-red-800"
            >
              {t('deadhens.title')} →
            </Link>
          </div>
        </div>
      )}

      {/* Section 1 — Hen Stats */}
      <div className="mt-5 space-y-3">
        {/* Hero Total Hens */}
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-100">
                <span className="text-base leading-none">🐔</span> {t('dashboard.totalHens')}
              </p>
              {loading ? (
                <div className="mt-2 h-12 w-44 animate-pulse rounded-lg bg-white/30" />
              ) : (
                <p className="mt-1 text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">
                  {num(cards?.totalHens)}
                </p>
              )}
            </div>
            <p className="max-w-md text-xs leading-relaxed text-sky-100">{t('dashboard.allHensNote')}</p>
          </div>
        </div>

        {/* Dead / Live / Today's Deaths */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard loading={loading} label={t('dashboard.deadHens')} value={num(cards?.totalDeadHens)} icon={<span className="text-lg">💀</span>} accent="red" />
          <StatCard loading={loading} label={t('dashboard.liveHens')} value={num(cards?.liveHens)} icon={<span className="text-lg">🐔</span>} accent="green" />
          <StatCard loading={loading} label={t('dashboard.todayDeadHens')} value={num(cards?.todayDeadHens)} icon={<span className="text-lg">📅</span>} accent="amber" />
        </div>
      </div>

      {/* Section 2 — Per-Set Summary */}
      {!loading && cards?.setHens?.length > 0 && (
        <Section title={t('dashboard.perSetSummary')} emoji="🐔" cols="sm:grid-cols-2">
          {cards.setHens.map((s) => (
            <div key={String(s.id)} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">{s.name}</p>
                <Badge>{s.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('dashboard.totalHens')}</p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">{num(s.birdCount)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('dashboard.deadHens')}</p>
                  <p className="mt-0.5 text-base font-bold text-red-600">{num(s.deadHens)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('dashboard.liveHens')}</p>
                  <p className="mt-0.5 text-base font-bold text-emerald-600">{num(s.liveHens)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('dashboard.todayDeadHens')}</p>
                  <p className="mt-0.5 text-base font-bold text-amber-600">{num(s.todayDeaths)}</p>
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Section 3 — Recent Daily Mortality */}
      <Section title={t('dashboard.recentMortality')} emoji="📉" cols="grid-cols-1">
        <DataTable
          columns={[
            {
              key: 'date',
              header: t('common.date'),
              render: (r) => <span className="font-semibold">{fmtDate(r.date)}</span>,
            },
            {
              key: 'set',
              header: t('deadhens.set'),
              render: (r) => (r.set?.name ? <span className="font-semibold text-slate-700">{r.set.name}</span> : <span className="text-slate-400">-</span>),
            },
            {
              key: 'deadHens',
              header: t('dashboard.deadHens'),
              render: (r) => <span className="font-bold text-red-600">{num(r.deadHens)}</span>,
            },
            {
              key: 'reason',
              header: t('common.reason'),
              render: (r) => (r.reason ? <span className="text-slate-600">{r.reason}</span> : <span className="text-slate-400">-</span>),
            },
          ]}
          rows={loading ? [] : recentMortalityRows}
          loading={loading}
          emptyTitle={t('deadhens.noRecords')}
          emptyHint={t('deadhens.noRecordsHint')}
        />
      </Section>

      {/* Section 4 — Hen Mortality Chart (7 days) */}
      <div className="mt-5">
        <ChartCard title={t('dashboard.dailyHenMortality')} loading={loading}>
          {mortalityChart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mortalityChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="deadHens" name={t('dashboard.deadHens')} fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty title={t('dashboard.noData')} />
          )}
        </ChartCard>
      </div>

      {/* Section 5 — Egg Overview */}
      <Section title={t('dashboard.eggSection')} emoji="🥚">
        <StatCard loading={loading} label={t('dashboard.totalEggs')} value={num(cards?.totalEggs)} icon={<span className="text-lg">🥚</span>} accent="brand" />
        <StatCard loading={loading} label={t('dashboard.singleEggs')} value={num(cards?.singleEggs)} icon={<span className="text-lg">🥚</span>} accent="amber" />
        <StatCard loading={loading} label={t('dashboard.doubleEggs')} value={num(cards?.doubleEggs)} icon={<span className="text-lg">🥚</span>} accent="violet" />
        <StatCard loading={loading} label={t('dashboard.brokenEggs')} value={num(cards?.brokenEggs)} icon={<span className="text-lg">💔</span>} accent="red" />
        <StatCard loading={loading} label={t('dashboard.sellableEggs')} value={num(cards?.sellableEggs)} icon={<span className="text-lg">✅</span>} accent="green" />
        <StatCard loading={loading} label={t('dashboard.eggsSoldLocally')} value={num(cards?.eggsSold)} icon={<span className="text-lg">🛒</span>} accent="blue" />
        <StatCard loading={loading} label={t('dashboard.remainingEggs')} value={num(cards?.remainingEggs)} icon={<span className="text-lg">🏬</span>} accent={cards?.lowEgg ? 'red' : 'violet'} sub={cards?.lowEgg ? t('dashboard.lowEgg', { min: cards?.minEgg ?? 0 }) : t('dashboard.stockAvailable')} />
        <StatCard loading={loading} label={t('dashboard.eggProductionRate')} value={`${num(cards?.productionRate, 1)}%`} icon={<span className="text-lg">📊</span>} accent="brand" />
        <StatCard loading={loading} label={t('dashboard.avgEggsPerHen')} value={num(cards?.avgEggsPerHen, 2)} icon={<span className="text-lg">🥚</span>} accent="blue" />
      </Section>

      {/* Section 4 — Feed Overview */}
      <Section title={t('dashboard.feedSection')} emoji="🌾">
        <StatCard loading={loading} label={t('dashboard.feedRemaining')} value={`${num(cards?.feedRemaining)} kg`} icon={<span className="text-lg">🌾</span>} accent={cards?.lowFeed ? 'red' : 'amber'} sub={cards?.lowFeed ? t('dashboard.feedLow', { min: `${cards?.minFeed ?? 0} kg` }) : t('dashboard.stockAvailable')} />
        <StatCard loading={loading} label={t('dashboard.feedUsed')} value={`${num(cards?.feedUsed)} kg`} icon={<span className="text-lg">🗓</span>} accent="amber" />
      </Section>

      {/* Section 5 — Labour & Expenses */}
      <Section title={t('dashboard.labourSection')} emoji="👷">
        <StatCard loading={loading} label={t('dashboard.totalLabours')} value={num(cards?.totalLabours)} icon={<span className="text-lg">🧑‍🌾</span>} accent="amber" />
        <StatCard loading={loading} label={t('dashboard.labourExpense')} value={inr(cards?.labourExpense)} icon={<span className="text-lg">🧾</span>} accent="red" />
        <StatCard loading={loading} label={t('dashboard.expensesInclFeed')} value={inr(cards?.totalExpenses)} icon={<span className="text-lg">🧾</span>} accent="red" />
        <StatCard loading={loading} label={t('dashboard.netProfit')} value={inr(cards?.netProfit)} icon={<span className="text-lg">📈</span>} accent={cards?.netProfit >= 0 ? 'green' : 'red'} />
      </Section>

      {/* Section 6 — Finance Overview */}
      <Section title={t('dashboard.financeSection')} emoji="💰" cols="sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('dashboard.totalRevenue')}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{inr(cards?.totalRevenue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('dashboard.totalExpenses')}</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{inr(cards?.totalExpenses)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('dashboard.profitMargin')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{num(cards?.profitMargin, 1)}%</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('dashboard.costProfit', { cost: inr(cards?.costPerEgg), profit: inr(cards?.profitPerEgg) })}
          </p>
        </div>
      </Section>

      {/* Egg price bar */}
      <div className="mt-4 card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('dashboard.eggPrice')}</p>
            <p className="text-2xl font-bold text-slate-900">
              ₹{data?.eggPrice?.pricePerEgg ? Number(data?.eggPrice?.pricePerEgg).toFixed(2) : '--'}{t('dashboard.perEgg')}
            </p>
          </div>
          <div className="text-right">
            <span className={`badge ${sourceBadge[data?.eggPrice?.source] || sourceBadge.NONE}`}>
              {data?.eggPrice?.source === 'LAST_KNOWN' ? t('dashboard.lastKnownPrice') : data?.eggPrice?.source === 'API' ? t('dashboard.liveApiPrice') : data?.eggPrice?.source === 'MANUAL' ? t('dashboard.manualPrice') : t('dashboard.noPrice')}
            </span>
            <p className="mt-1 text-xs text-slate-500">
              {t('dashboard.updated', { date: data?.eggPrice?.updated ? fmtDateTime(data?.eggPrice?.updated) : t('common.unavailable') })}
            </p>
          </div>
        </div>
        {data?.eggPrice?.notes && (
          <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            {data?.eggPrice?.notes}
          </p>
        )}
      </div>

      {/* Local sales cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard loading={loading} label={t('dashboard.localSales')} value={inr(cards?.salesRevenue)} icon={<span className="text-lg">💰</span>} accent="green" />
        <StatCard loading={loading} label={t('dashboard.amountReceived')} value={inr(cards?.amountReceived)} icon={<span className="text-lg">💵</span>} accent="green" />
        <StatCard loading={loading} label={t('dashboard.pendingAmount')} value={inr(cards?.pendingAmount)} icon={<span className="text-lg">⏳</span>} accent={cards?.pendingAmount > 0 ? 'red' : 'green'} />
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('dashboard.eggProduction')} loading={loading}>
          {productionChart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={productionChart}>
                <defs>
                  <linearGradient id="gEgg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e99d1d" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#e99d1d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Total Eggs" name={t('dashboard.totalEggs')} stroke="#e99d1d" fill="url(#gEgg)" />
                <Area type="monotone" dataKey="Single" name={t('eggs.single')} stroke="#f59e0b" fill="none" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="Double" name={t('eggs.double')} stroke="#8b5cf6" fill="none" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="Broken" name={t('eggs.broken')} stroke="#ef4444" fill="none" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="Sellable Eggs" name={t('eggs.sellable')} stroke="#10b981" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty title={t('dashboard.noData')} />
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.localSalesRevenue')} loading={loading}>
          {salesChart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="single" name={t('eggs.single')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="double" name={t('eggs.double')} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name="₹" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty title={t('dashboard.noData')} />
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.expenses')} loading={loading}>
          {expenseChart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={expenseChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="amount" name="₹" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty title={t('dashboard.noData')} />
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.feedUsage')} loading={loading}>
          {feedChart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={feedChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="used" name={t('feed.used')} stroke="#d97706" strokeWidth={2} />
                <Line type="monotone" dataKey="cost" name={t('feed.cost')} stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty title={t('dashboard.noData')} />
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.labourTrend')} loading={loading}>
          {labourTrendChart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={labourTrendChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, t('common.amount')]} />
                <Bar dataKey="amount" name="₹" fill="#d946ef" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty title={t('dashboard.noData')} />
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.labourExpenseByCategory')} loading={loading}>
          {labourBreakdownChart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={labourBreakdownChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={(e) => e.name}
                >
                  {labourBreakdownChart.map((_, i) => (
                    <Cell key={i} fill={['#f97316', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i % 6]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty title={t('dashboard.noData')} />
          )}
        </ChartCard>
      </div>

      {/* Notes */}
      <p className="mt-4 text-center text-xs text-slate-400">
        {t('dashboard.farmFooter', { farm: settings.farmName, location: settings.location })}
      </p>
    </div>
  );
}

function Section({ title, emoji, highlight = false, cols = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', children }) {
  return (
    <section className={highlight ? 'mt-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4' : 'mt-5'}>
      <h2 className={`mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${highlight ? 'text-amber-800' : 'text-slate-700'}`}>
        <span className="text-base leading-none">{emoji}</span> {title}
      </h2>
      <div className={`grid gap-3 ${cols}`}>{children}</div>
    </section>
  );
}

function ChartCard({ title, children, loading }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="chart" className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      {loading ? (
        <div className="h-[260px] animate-pulse rounded-lg bg-slate-100" />
      ) : (
        children
      )}
    </div>
  );
}

function ChartEmpty({ title }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
      {title}
    </div>
  );
}