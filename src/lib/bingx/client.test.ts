import { describe, expect, it } from "vitest";

import { BingXClient } from "@/lib/bingx/client";

describe("BingX client", () => {
  it("uses Standard Futures contract endpoints", async () => {
    const requestedUrls: string[] = [];
    const fetcher = async (input: string | URL | Request) => {
      requestedUrls.push(String(input));

      return Response.json({ code: 0, data: [] });
    };
    const client = new BingXClient({
      apiKey: "key",
      apiSecret: "secret",
      baseUrl: "https://open-api.bingx.com",
      now: () => 1000,
      fetcher: fetcher as typeof fetch
    });

    await client.getStandardFuturesOrders({ symbol: "BTC-USDT", limit: 100 });

    expect(requestedUrls[0]).toContain("/openApi/contract/v1/allOrders?");
    expect(requestedUrls).toHaveLength(1);
  });

  it("uses perpetual summary endpoints", async () => {
    const requestedUrls: string[] = [];
    const fetcher = async (input: string | URL | Request) => {
      requestedUrls.push(String(input));

      return Response.json({ code: 0, data: [] });
    };
    const client = new BingXClient({
      apiKey: "key",
      apiSecret: "secret",
      baseUrl: "https://open-api.bingx.com",
      now: () => 1000,
      fetcher: fetcher as typeof fetch
    });

    await client.getPerpetualPositionHistory({ symbol: "BTC-USDT", limit: 100 });
    await client.getPerpetualIncome({ symbol: "BTC-USDT", limit: 100 });

    expect(requestedUrls[0]).toContain("/openApi/swap/v1/trade/positionHistory?");
    expect(requestedUrls[1]).toContain("/openApi/swap/v2/user/income?");
  });
});
