import { buildQueryString, signBingXQuery } from "@/lib/bingx/signing";

type BingXClientOptions = {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  now?: () => number;
  fetcher?: typeof fetch;
};

type SignedGetOptions = {
  path: string;
  params?: Record<string, string | number | undefined>;
};

type TimeRangeParams = {
  symbol?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
};

type SymbolParams = {
  symbol?: string;
};

export class BingXClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly now: () => number;
  private readonly fetcher: typeof fetch;

  constructor(options: BingXClientOptions) {
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.now = options.now ?? Date.now;
    this.fetcher = options.fetcher ?? fetch;
  }

  async getPerpetualOrders(params: TimeRangeParams) {
    return this.signedGet({
      path: "/openApi/swap/v2/trade/allOrders",
      params
    });
  }

  async getPerpetualFills(params: TimeRangeParams) {
    return this.signedGet({
      path: "/openApi/swap/v2/trade/allFillOrders",
      params
    });
  }

  async getPerpetualOpenOrders(params: SymbolParams = {}) {
    return this.signedGet({
      path: "/openApi/swap/v2/trade/openOrders",
      params
    });
  }

  async getPerpetualPositions(params: SymbolParams = {}) {
    return this.signedGet({
      path: "/openApi/swap/v2/user/positions",
      params
    });
  }

  async getPerpetualPositionHistory(params: TimeRangeParams) {
    return this.signedGet({
      path: "/openApi/swap/v1/trade/positionHistory",
      params
    });
  }

  async getPerpetualIncome(params: TimeRangeParams) {
    return this.signedGet({
      path: "/openApi/swap/v2/user/income",
      params
    });
  }

  async getPerpetualBalance() {
    return this.signedGet({
      path: "/openApi/swap/v2/user/balance"
    });
  }

  async getStandardFuturesOrders(params: TimeRangeParams) {
    return this.signedGet({
      path: "/openApi/contract/v1/allOrders",
      params
    });
  }

  async testConnection() {
    return this.getPerpetualBalance();
  }

  private async signedGet({ path, params = {} }: SignedGetOptions) {
    const queryString = buildQueryString({
      ...params,
      recvWindow: 5000,
      timestamp: this.now()
    });
    const signature = signBingXQuery(queryString, this.apiSecret);
    const url = `${this.baseUrl}${path}?${queryString}&signature=${signature}`;
    const response = await this.fetcher(url, {
      method: "GET",
      headers: {
        "X-BX-APIKEY": this.apiKey
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`BingX request failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as unknown;

    assertBingXSuccess(payload);

    return payload;
  }
}

function assertBingXSuccess(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("BingX returned an invalid response.");
  }

  const response = payload as { code?: unknown; msg?: unknown };
  const code = response.code === undefined ? 0 : Number(response.code);

  if (Number.isFinite(code) && code !== 0) {
    throw new Error(
      typeof response.msg === "string"
        ? response.msg
        : `BingX returned error code ${code}.`
    );
  }
}
