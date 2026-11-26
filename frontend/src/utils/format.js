export const inr = (value, decimals = 2) => {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: num % 1 === 0 ? (decimals === 0 ? 0 : 0) : decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const inrFixed = (value) => {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const num = (value, decimals = 0) => {
  const n = Number(value) || 0;
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
};

export const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayInput = () => toDateInput(new Date());

export const statusBadgeClass = (status) => {
  const s = String(status || '').toUpperCase();
  if (['PAID', 'ACTIVE', 'COMPLETED'].includes(s)) return 'bg-emerald-100 text-emerald-700';
  if (['PARTIAL', 'INACTIVE'].includes(s)) return 'bg-amber-100 text-amber-700';
  if (s === 'PENDING') return 'bg-red-100 text-red-700';
  if (s === 'UNPAID') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-600';
};

export const toURLObj = (params) => {
  const o = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) o[k] = v;
  });
  return o;
};