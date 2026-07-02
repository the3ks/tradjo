import { describe, expect, it } from "vitest";

import { parsePortfolioCsvImport } from "@/lib/portfolio-import-parser";

describe("portfolio import parser", () => {
  it("parses portfolio asset csv rows", () => {
    const drafts = parsePortfolioCsvImport(`action,symbol,assetClass,positionType,quantity,price,feeAmount,currency,exchange,date
buy,BTC,crypto,spot,0.5,60000,2,USDT,Binance,2026-07-01
sell,TSLA,stock,spot,10,200,1,USDT,,2026-07-02`);

    expect(drafts).toEqual([
      {
        action: "BUY",
        assetClass: "CRYPTO",
        currency: "USDT",
        exchange: "Binance",
        feeAmount: 2,
        positionType: "SPOT",
        price: 60000,
        quantity: 0.5,
        symbol: "BTC",
        transactionDate: "2026-07-01"
      },
      {
        action: "SELL",
        assetClass: "STOCK",
        currency: "USDT",
        exchange: null,
        feeAmount: 1,
        positionType: "SPOT",
        price: 200,
        quantity: 10,
        symbol: "TSLA",
        transactionDate: "2026-07-02"
      }
    ]);
  });

  it("defaults cash rows to balance positions at unit price", () => {
    const drafts = parsePortfolioCsvImport(`action,symbol,quantity,currency,exchange
deposit,USDT,1000,USDT,BingX
withdraw,USDT,250,USDT,BingX`);

    expect(drafts.map((draft) => draft.action)).toEqual(["DEPOSIT", "WITHDRAWAL"]);
    expect(drafts[0]).toMatchObject({
      assetClass: "CASH",
      positionType: "BALANCE",
      price: 1
    });
  });
});
