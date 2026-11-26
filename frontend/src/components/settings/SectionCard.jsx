export default function SectionCard({ emoji, title, subtitle, children, actions }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="text-base leading-none">{emoji}</span> {title}
          </h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}