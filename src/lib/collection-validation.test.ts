import { describe, expect, it } from "vitest";

import {
  validateCollectionParent,
  validateSyncSourceCollection
} from "@/lib/collection-validation";

describe("collection validation", () => {
  it("allows folder parents owned by the same user", () => {
    const result = validateCollectionParent(
      { id: "folder-1", type: "FOLDER", userId: "user-1" },
      "user-1"
    );

    expect(result.ok).toBe(true);
  });

  it("rejects trading parents", () => {
    const result = validateCollectionParent(
      { id: "trading-1", type: "TRADING", userId: "user-1" },
      "user-1"
    );

    expect(result).toEqual({
      ok: false,
      message: "Trading collections cannot contain child collections."
    });
  });

  it("rejects parents owned by another user", () => {
    const result = validateCollectionParent(
      { id: "folder-1", type: "FOLDER", userId: "user-2" },
      "user-1"
    );

    expect(result).toEqual({
      ok: false,
      message: "Parent collection was not found."
    });
  });

  it("allows sync sources only on trading collections", () => {
    expect(validateSyncSourceCollection("TRADING").ok).toBe(true);
    expect(validateSyncSourceCollection("FOLDER")).toEqual({
      ok: false,
      message: "Only trading collections can have sync sources."
    });
  });
});
