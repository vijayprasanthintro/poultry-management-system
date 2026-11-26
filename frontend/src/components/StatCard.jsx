import { statusBadgeClass } from '../utils/format';

export function Badge({ children, className = '' }) {
  const cls = className || statusBadgeClass(children);
  return <span className={`badge ${cls}`}>{children}</span>;
}

export function StatCard({ label, value, sub, icon, accent = 'brand', loading }) {
  const accents = {
    brand: 'bg-brand-50 text-brand-700 border-brand-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };
  const a = accents[accent] || accents.brand;

  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`rounded-xl p-2.5 border ${a}`}>{icon || <span className="text-lg">📦</span>}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
        {loading ? (
          <div className="mt-1 h-6 w-20 animate-pulse rounded bg-slate-200" />
        ) : (
          <p className="text-lg font-bold text-slate-900 leading-tight break-words">{value}</p>
        )}
        {sub && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default StatCard;