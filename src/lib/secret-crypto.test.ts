import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

describe("secret crypto", () => {
  it("round-trips encrypted values", () => {
    const encrypted = encryptSecret("api-secret-value", "local-test-key");

    expect(encrypted).not.toContain("api-secret-value");
    expect(decryptSecret(encrypted, "local-test-key")).toBe("api-secret-value");
  });

  it("rejects the wrong key", () => {
    const encrypted = encryptSecret("api-secret-value", "local-test-key");

    expect(() => decryptSecret(encrypted, "other-key")).toThrow();
  });
});
