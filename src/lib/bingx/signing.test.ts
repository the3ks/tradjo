import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import { buildQueryString, signBingXQuery } from "@/lib/bingx/signing";

describe("BingX signing", () => {
  it("builds sorted query strings without undefined values", () => {
    expect(
      buildQueryString({
        timestamp: 3,
        symbol: "BTC-USDT",
        ignored: undefined,
        recvWindow: 5000
      })
    ).toBe("recvWindow=5000&symbol=BTC-USDT&timestamp=3");
  });

  it("signs query strings with HMAC SHA256", () => {
    const query = "recvWindow=5000&timestamp=3";

    expect(signBingXQuery(query, "secret")).toBe(
      createHmac("sha256", "secret").update(query).digest("hex")
    );
  });
});
