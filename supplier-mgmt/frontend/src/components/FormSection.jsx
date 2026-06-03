/** Grouped form block with a section title (EOD, invoices, etc.). */
export default function FormSection({ title, description, children, className = '' }) {
  return (
    <section className={`form-section ${className}`.trim()}>
      <div className="mb-3 border-b border-slate-200/80 pb-2">
        <h3 className="form-section-title">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
