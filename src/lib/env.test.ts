import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("accepts valid application environment values", () => {
    const env = parseEnv({
      DATABASE_URL: "mysql://root:password@localhost:3306/trading_journal",
      AUTH_SECRET: "12345678901234567890123456789012",
      AUTH_URL: "http://localhost:3000",
      ENCRYPTION_KEY: "abcdefghijklmnopqrstuvwxyz123456"
    });

    expect(env.SCREENSHOT_STORAGE_DIR).toBe("./uploads/screenshots");
  });

  it("rejects short secrets", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "mysql://root:password@localhost:3306/trading_journal",
        AUTH_SECRET: "short",
        ENCRYPTION_KEY: "short"
      })
    ).toThrow();
  });
});
