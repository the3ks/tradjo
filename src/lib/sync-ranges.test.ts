import { describe, expect, it } from "vitest";

import { determineFetchWindow } from "@/lib/sync-ranges";

describe("determineFetchWindow", () => {
  it("uses a six hour overlap after cursor initialization", () => {
    const window = determineFetchWindow({
      lastEventTime: new Date("2026-06-27T12:00:00.000Z"),
      initialSync: {
        mode: "LAST_7_DAYS",
        now: new Date("2026-06-27T18:00:00.000Z"),
        timezone: "UTC"
      }
    });

    expect(window).toEqual({
      kind: "time-range",
      from: new Date("2026-06-27T06:00:00.000Z"),
      to: new Date("2026-06-27T18:00:00.000Z")
    });
  });

  it("defaults initial sync to the last seven days", () => {
    const window = determineFetchWindow({
      initialSync: {
        mode: "LAST_7_DAYS",
        now: new Date("2026-06-27T18:00:00.000Z"),
        timezone: "UTC"
      }
    });

    expect(window).toEqual({
      kind: "time-range",
      from: new Date("2026-06-20T18:00:00.000Z"),
      to: new Date("2026-06-27T18:00:00.000Z")
    });
  });

  it("uses previous calendar day start in the user's timezone", () => {
    const window = determineFetchWindow({
      initialSync: {
        mode: "YESTERDAY",
        now: new Date("2026-06-26T04:00:00.000Z"),
        timezone: "Asia/Ho_Chi_Minh"
      }
    });

    expect(window.kind).toBe("time-range");
    expect(window.kind === "time-range" ? window.from : null).toEqual(
      new Date("2026-06-24T17:00:00.000Z")
    );
  });

  it("returns open-only for open initial sync mode", () => {
    expect(
      determineFetchWindow({
        initialSync: {
          mode: "OPEN_ONLY",
          now: new Date("2026-06-27T18:00:00.000Z"),
          timezone: "UTC"
        }
      })
    ).toEqual({ kind: "open-only" });
  });
});
