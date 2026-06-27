import { describe, expect, it } from "vitest";

import {
  canContainChildren,
  canContainTrades,
  canHaveSyncSource
} from "@/lib/collection-rules";

describe("collection rules", () => {
  it("allows folder collections to contain children only", () => {
    expect(canContainChildren("FOLDER")).toBe(true);
    expect(canContainTrades("FOLDER")).toBe(false);
    expect(canHaveSyncSource("FOLDER")).toBe(false);
  });

  it("allows trading collections to contain trades and sync sources only", () => {
    expect(canContainChildren("TRADING")).toBe(false);
    expect(canContainTrades("TRADING")).toBe(true);
    expect(canHaveSyncSource("TRADING")).toBe(true);
  });
});
