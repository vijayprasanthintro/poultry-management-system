import { useEffect, useState } from 'react';
import { auditApi } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { Badge } from '../components/Badge';
import { ErrorBox } from '../components/Spinner';
import { fmtDateTime } from '../utils/format';

const RANGES = [
  { value: 'today', labelKey: 'common.today' },
  { value: 'yesterday', labelKey: 'common.yesterday' },
  { value: '7', labelKey: 'common.last7' },
  { value: '30', labelKey: 'common.last30' },
  { value: 'month', labelKey: 'common.month' },
  { value: 'year', labelKey: 'common.year' },
];

const actionClass = (action) => {
  const a = String(action || '').toUpperCase();
  if (a.includes('LOGIN')) return 'bg-sky-100 text-sky-700';
  if (a.includes('CREATE')) return 'bg-emerald-100 text-emerald-700';
  if (a.includes('UPDATE')) return 'bg-amber-100 text-amber-700';
  if (a.includes('DELETE')) return 'bg-red-100 text-red-700';
  if (a.includes('SETTINGS')) return 'bg-violet-100 text-violet-700';
  return 'bg-slate-100 text-slate-600';
};

const prettyValue = (v) => {
  if (!v) return '-';
  try {
    const json = JSON.stringify(v);
    return json.length > 140 ? `${json.slice(0, 140)}…` : json;
  } catch {
    return String(v);
  }
};

export default function AuditLogs() {
  const { t } = useLanguage();
  const [range, setRange] = useState('7');
  const [action, setAction] = useState('');
  const [recordType, setRecordType] = useState('');

  const { data, loading, error, refetch } = useFetch(
    auditApi.getAll,
    { range, action, recordType },
    { logs: [] }
  );

  useEffect(() => {
    refetch({ range, action, recordType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, action, recordType]);

  const logs = data?.logs || [];

  const columns = [
    { key: 'createdAt', header: t('audit.when'), render: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</span> },
    { key: 'adminName', header: t('audit.admin'), render: (r) => r.adminName || 'admin' },
    { key: 'action', header: t('audit.action'), render: (r) => <Badge className={actionClass(r.action)}>{r.action}</Badge> },
    { key: 'recordType', header: t('audit.record'), render: (r) => <span className="text-xs font-semibold text-slate-600">{r.recordType}</span> },
    { key: 'recordId', header: t('audit.recordId'), render: (r) => <span className="font-mono text-xs text-slate-500">{r.recordId?.slice(0, 10) || '-'}</span> },
    { key: 'newValue', header: t('audit.details'), render: (r) => <span className="font-mono text-xs text-slate-500" title={prettyValue(r.newValue)}>{prettyValue(r.newValue)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
      />

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value)}>
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{t(r.labelKey)}</option>
          ))}
        </select>
        <input
          className="input !w-auto"
          placeholder={t('audit.actionPlaceholder')}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <input
          className="input !w-auto"
          placeholder={t('audit.recordTypePlaceholder')}
          value={recordType}
          onChange={(e) => setRecordType(e.target.value)}
        />
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : logs}
        loading={loading}
        emptyTitle={t('audit.noEntries')}
        emptyHint={t('audit.noEntriesHint')}
      />
    </div>
  );
}