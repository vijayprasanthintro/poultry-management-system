/* Responsive data table: converts to stacked cards on small screens. */
import EmptyState from './EmptyState';
import { useLanguage } from '../i18n/LanguageContext';

export function DataTable({
  columns = [],
  rows = [],
  keyFn = (r) => r._id,
  loading = false,
  emptyTitle,
  emptyHint,
  actions,
}) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="card p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="my-2 h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="card">
        <EmptyState title={emptyTitle || t('common.noRecords')} hint={emptyHint || t('common.noRecordsHint')} />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={keyFn(row)} className="hover:bg-orange-50/50">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    {c.render ? c.render(row) : String(row[c.key] ?? '-')}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={keyFn(row)} className="p-4 space-y-2">
            {columns.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.header}</span>
                <span className="text-sm font-medium text-slate-800 text-right">
                  {c.render ? c.render(row) : String(row[c.key] ?? '-')}
                </span>
              </div>
            ))}
            {actions && (
              <div className="flex justify-end gap-2 pt-1">{actions(row)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DataTable;