type PageHeaderProps = {
  action?: React.ReactNode;
  title: string;
  description: string;
};

export function PageHeader({ action, title, description }: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex max-w-7xl items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
