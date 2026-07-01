import { describe, expect, it } from "vitest";

import {
  buildCashSettlementLedger,
  calculatePortfolioPosition,
  PortfolioBalanceError
} from "@/lib/portfolio-ledger";

describe("portfolio ledger calculation", () => {
  it("uses weighted average cost and realized pnl for asset buys and sells", () => {
    const position = calculatePortfolioPosition(
      { assetClass: "CRYPTO", positionType: "SPOT" },
      [
        { action: "BUY", quantityChange: 1, price: 100, feeAmount: 1 },
        { action: "BUY", quantityChange: 1, price: 200, feeAmount: 1 },
        { action: "SELL", quantityChange: -0.5, price: 250, feeAmount: 2 }
      ]
    );

    expect(position.currentQuantity).toBe(1.5);
    expect(position.averageCost).toBe(151);
    expect(position.realizedPnl).toBe(47.5);
  });

  it("allows general and exchange cash balances to stay non-negative", () => {
    const position = calculatePortfolioPosition(
      { assetClass: "CASH", positionType: "BALANCE" },
      [
        { action: "DEPOSIT", quantityChange: 1000, price: 1 },
        { action: "WITHDRAWAL", quantityChange: -300, price: 1 }
      ]
    );

    expect(position.currentQuantity).toBe(700);
    expect(position.averageCost).toBe(1);
  });

  it("blocks negative cash balances by default", () => {
    expect(() =>
      calculatePortfolioPosition(
        { assetClass: "CASH", positionType: "BALANCE" },
        [
          { action: "DEPOSIT", quantityChange: 100, price: 1 },
          { action: "WITHDRAWAL", quantityChange: -150, price: 1 }
        ]
      )
    ).toThrow(PortfolioBalanceError);
  });

  it("builds linked buy settlement as a cash deduction", () => {
    const settlement = buildCashSettlementLedger({
      action: "BUY",
      settlementAmount: 600
    });
    const position = calculatePortfolioPosition(
      { assetClass: "CASH", positionType: "BALANCE" },
      [
        { action: "DEPOSIT", quantityChange: 1000, price: 1 },
        settlement
      ]
    );

    expect(settlement).toMatchObject({
      action: "WITHDRAWAL",
      quantityChange: -600
    });
    expect(position.currentQuantity).toBe(400);
  });

  it("builds linked sell settlement as a cash deposit", () => {
    const settlement = buildCashSettlementLedger({
      action: "SELL",
      settlementAmount: 250
    });
    const position = calculatePortfolioPosition(
      { assetClass: "CASH", positionType: "BALANCE" },
      [
        { action: "DEPOSIT", quantityChange: 1000, price: 1 },
        settlement
      ]
    );

    expect(settlement).toMatchObject({
      action: "DEPOSIT",
      quantityChange: 250
    });
    expect(position.currentQuantity).toBe(1250);
  });
});
