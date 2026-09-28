export function Row({ title, hint, children, id }: { title: string; hint?: string; children?: React.ReactNode; id?: string }) {
  return (
    <section className="srow" id={id}>
      <div className="srow__text">
        <h2 className="title-sm">{title}</h2>
        {hint && <p className="small muted">{hint}</p>}
      </div>
      {children && <div className="srow__ctrl">{children}</div>}
    </section>
  );
}
