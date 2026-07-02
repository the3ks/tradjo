import Link from "next/link";

export function ImportTargetRouter({ active }: { active: "journal" | "portfolio" }) {
  return (
    <section className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-2">
      <Link
        className={`rounded-lg border px-4 py-3 transition hover:bg-background/70 ${
          active === "journal"
            ? "border-accent bg-accent/10"
            : "border-border bg-background"
        }`}
        href="/trades/import-screenshot"
      >
        <p className="text-sm font-semibold">Trading Journal</p>
        <p className="mt-1 text-xs leading-5 text-muted">Tactical trade imports</p>
      </Link>
      <Link
        className={`rounded-lg border px-4 py-3 transition hover:bg-background/70 ${
          active === "portfolio"
            ? "border-accent bg-accent/10"
            : "border-border bg-background"
        }`}
        href="/portfolio/import"
      >
        <p className="text-sm font-semibold">Portfolio Ledger</p>
        <p className="mt-1 text-xs leading-5 text-muted">Long-term holdings imports</p>
      </Link>
    </section>
  );
}
