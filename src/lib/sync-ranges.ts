import type { InitialSyncMode } from "@prisma/client";

const overlapMs = 6 * 60 * 60 * 1000;

type InitialSyncInput = {
  mode: InitialSyncMode;
  now: Date;
  timezone: string;
  customStart?: Date | null;
  customEnd?: Date | null;
};

export type SyncFetchWindow =
  | {
      kind: "time-range";
      from: Date;
      to: Date;
    }
  | {
      kind: "open-only";
    };

export function determineFetchWindow(input: {
  lastEventTime?: Date | null;
  initialSync: InitialSyncInput;
}): SyncFetchWindow {
  if (input.lastEventTime) {
    return {
      kind: "time-range",
      from: new Date(input.lastEventTime.getTime() - overlapMs),
      to: input.initialSync.now
    };
  }

  switch (input.initialSync.mode) {
    case "YESTERDAY":
      return {
        kind: "time-range",
        from: startOfPreviousCalendarDayUtc(
          input.initialSync.now,
          input.initialSync.timezone
        ),
        to: input.initialSync.now
      };
    case "CUSTOM_RANGE":
      if (!input.initialSync.customStart || !input.initialSync.customEnd) {
        throw new Error("Custom sync range requires start and end times.");
      }

      return {
        kind: "time-range",
        from: input.initialSync.customStart,
        to: input.initialSync.customEnd
      };
    case "OPEN_ONLY":
      return { kind: "open-only" };
    case "LAST_7_DAYS":
    default:
      return {
        kind: "time-range",
        from: new Date(input.initialSync.now.getTime() - 7 * 24 * 60 * 60 * 1000),
        to: input.initialSync.now
      };
  }
}

function startOfPreviousCalendarDayUtc(now: Date, timezone: string) {
  const parts = getZonedParts(now, timezone);
  const localToday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const localYesterday = new Date(localToday.getTime() - 24 * 60 * 60 * 1000);

  return zonedWallTimeToUtc(
    {
      year: localYesterday.getUTCFullYear(),
      month: localYesterday.getUTCMonth() + 1,
      day: localYesterday.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0
    },
    timezone
  );
}

function getZonedParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function zonedWallTimeToUtc(
  wallTime: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  },
  timezone: string
) {
  let guess = Date.UTC(
    wallTime.year,
    wallTime.month - 1,
    wallTime.day,
    wallTime.hour,
    wallTime.minute,
    wallTime.second
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getZonedParts(new Date(guess), timezone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    const targetAsUtc = Date.UTC(
      wallTime.year,
      wallTime.month - 1,
      wallTime.day,
      wallTime.hour,
      wallTime.minute,
      wallTime.second
    );
    guess += targetAsUtc - actualAsUtc;
  }

  return new Date(guess);
}
