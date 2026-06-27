import { describe, expect, it } from "vitest";

import {
  extractBingXRows,
  normalizeBingXFill,
  normalizeBingXIncome,
  normalizeBingXOrder,
  normalizeBingXPosition
} from "@/lib/bingx/normalize";

describe("BingX normalization", () => {
  it("extracts rows from common response containers", () => {
    expect(
      extractBingXRows({
        code: 0,
        data: {
          orders: [{ orderId: "1" }]
        }
      })
    ).toEqual([{ orderId: "1" }]);
  });

  it("normalizes raw orders", () => {
    expect(
      normalizeBingXOrder(
        {
          orderId: "order-1",
          symbol: "BTC-USDT",
          status: "FILLED",
          price: "100",
          origQty: "0.5",
          executedQty: "0.5",
          time: 1000
        },
        "PERPETUAL"
      )
    ).toMatchObject({
      exchangeOrderId: "order-1",
      symbol: "BTC-USDT",
      status: "FILLED",
      isTerminal: true,
      createdTime: new Date(1000)
    });
  });

  it("normalizes raw fills", () => {
    expect(
      normalizeBingXFill(
        {
          tradeId: "fill-1",
          orderId: "order-1",
          symbol: "BTC-USDT",
          price: "100",
          qty: "0.5",
          commission: "0.01",
          commissionAsset: "USDT",
          time: 1000
        },
        "PERPETUAL"
      )
    ).toMatchObject({
      exchangeFillId: "fill-1",
      exchangeOrderId: "order-1",
      fee: "0.01",
      feeCurrency: "USDT",
      executedAt: new Date(1000)
    });
  });

  it("normalizes raw positions", () => {
    expect(
      normalizeBingXPosition(
        {
          symbol: "BTC-USDT",
          positionSide: "LONG",
          positionAmt: "0.5",
          avgPrice: "100",
          unrealizedProfit: "12.5",
          updateTime: 1000
        },
        "PERPETUAL"
      )
    ).toMatchObject({
      exchangePositionId: "BTC-USDT:LONG",
      symbol: "BTC-USDT",
      side: "LONG",
      quantity: "0.5",
      updatedTime: new Date(1000)
    });
  });

  it("normalizes raw income rows", () => {
    expect(
      normalizeBingXIncome(
        {
          incomeType: "FUNDING_FEE",
          income: "-0.12",
          asset: "USDT",
          symbol: "BTC-USDT",
          time: 1000
        },
        "PERPETUAL"
      )
    ).toMatchObject({
      exchangeIncomeId: "BTC-USDT:FUNDING_FEE:1000:-0.12",
      symbol: "BTC-USDT",
      incomeType: "FUNDING_FEE",
      amount: "-0.12",
      occurredAt: new Date(1000)
    });
  });
});
