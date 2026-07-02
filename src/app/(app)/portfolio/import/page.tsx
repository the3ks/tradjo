import Link from "next/link";

import { ImportTargetRouter } from "@/components/import-target-router";
import { PageHeader } from "@/components/page-header";
import { PortfolioImporter } from "@/components/portfolio/portfolio-importer";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type DecimalValue = {
  toString(): string;
};

export default async function PortfolioImportPage() {
  const userId = await requireUserId();
  const cashPositions = await prisma.portfolioPosition.findMany({
    where: {
      userId,
      assetClass: "CASH",
      positionType: "BALANCE"
    },
    orderBy: [{ symbol: "asc" }, { exchange: "asc" }],
    select: {
      id: true,
      symbol: true,
      exchange: true,
      currentQuantity: true
    }
  });
  const cashPositionOptions = cashPositions.map((position) => ({
    id: position.id,
    label: `${position.symbol} (${position.exchange ?? "General"}) - ${formatDecimal(
      position.currentQuantity
    )}`
  }));

  return (
    <>
      <PageHeader
        title="Import portfolio ledger"
        description="Route long-term holdings and cash balance imports into Portfolio Ledger rows."
        action={
          <Link
            className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-surface-elevated active:translate-y-px"
            href="/portfolio"
          >
            Back to portfolio
          </Link>
        }
      />
      <div className="grid gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <ImportTargetRouter active="portfolio" />
        <PortfolioImporter cashPositions={cashPositionOptions} />
      </div>
    </>
  );
}

function formatDecimal(value: DecimalValue) {
  return value.toString();
}
