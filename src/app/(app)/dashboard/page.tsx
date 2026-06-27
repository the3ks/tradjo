import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

const metrics = [
  { label: "Net P&L", value: "$0.00" },
  { label: "Win rate", value: "0%" },
  { label: "Trades", value: "0" },
  { label: "Profit factor", value: "0.00" }
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Review performance once synced trades are available."
      />
      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div
              className="rounded-xl border border-border bg-surface p-4"
              key={metric.label}
            >
              <p className="text-sm text-muted">{metric.label}</p>
              <p className="mt-3 font-mono text-2xl font-semibold">
                {metric.value}
              </p>
            </div>
          ))}
        </section>
        <EmptyState
          title="No synced trades yet"
          description="Connect BingX, configure a trading collection, and run a manual sync to populate dashboard metrics."
        />
      </div>
    </>
  );
}
