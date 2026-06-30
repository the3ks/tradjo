import { describe, expect, it } from "vitest";

import { parseBingXTableText } from "@/lib/bingx-table-text-parser";

describe("parseBingXTableText", () => {
  it("parses open positions with or without headers", () => {
    const drafts = parseBingXTableText(`
ETHUSDT
Long
87.79 USDT (10x)
Total Amount: 877.9
0.5518 ETH
+0.36 (+0.41%)
≈ 0.364123 USD
1,590.88
1,438.87
1,591.54
1,673.00
1,543.15(30%)
-- / --
Market Order
0.395055
0
2026/06/30 09:25:34
1589355328445976581
Close
Share
BTCUSDT
Long
100 USDT (20x)
Total Amount: 2,000
0.0333 BTC
-2.70 (-2.70%)
≈ -2.70 USD
59,922.06
57,222.57
59,841.06
--
/
--
-- / --
Market Order
0.9
0
2026/06/30 09:00:03
1589348906685534209
`);

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      screenType: "OPEN_POSITION",
      symbol: "ETHUSDT",
      side: "LONG",
      margin: 87.79,
      leverage: 10,
      totalVolume: 877.9,
      positionSize: 0.5518,
      entryPrice: 1590.88,
      liquidationPrice: 1438.87,
      currentPrice: 1591.54,
      takeProfit: 1673,
      stopLoss: 1543.15,
      tradingFee: 0.395055,
      fundingFee: 0,
      orderNo: "1589355328445976581"
    });
    expect(drafts[1]).toMatchObject({
      screenType: "OPEN_POSITION",
      symbol: "BTCUSDT",
      entryPrice: 59922.06,
      liquidationPrice: 57222.57,
      currentPrice: 59841.06,
      takeProfit: null,
      stopLoss: null,
      orderNo: "1589348906685534209"
    });
  });

  it("parses closed trades with copied table text", () => {
    const drafts = parseBingXTableText(`
Futures
Margin(Leverage)
PnL
Close Time
Close Type
Close Price
Trading Fee
Funding Fee
Open Time
Entry Price
Open Type
TP/SL
Trailing Stop
Order No.
Operation
BTCUSDT
Long
100 USDT
(20x)
+25.18 (25.18%)
2026/06/30 00:03:49	Triggered TP/SL
60,100
0.9	0.072	2026/06/29 22:19:03
59,352.59
Market Order
60,100.00
20%(58,759.06)
--/--
1589187594120859654
Share
`);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      screenType: "CLOSED_TRADE",
      symbol: "BTCUSDT",
      side: "LONG",
      margin: 100,
      leverage: 20,
      realizedPnl: 25.18,
      realizedPnlPercent: 25.18,
      closeTime: "2026/06/30 00:03:49",
      closePrice: 60100,
      tradingFee: 0.9,
      fundingFee: 0.072,
      openTime: "2026/06/29 22:19:03",
      entryPrice: 59352.59,
      orderType: "Market Order",
      takeProfit: 60100,
      stopLoss: 58759.06,
      orderNo: "1589187594120859654"
    });
    expect(drafts[0].warnings).toContain("Close type: Triggered TP/SL");
  });
});
