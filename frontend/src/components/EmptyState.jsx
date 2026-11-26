export function EmptyState({ icon = '📭', title = 'No data available', hint = 'Add a new record to get started.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="text-4xl">{icon}</div>
      <p className="mt-3 font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export default EmptyState;