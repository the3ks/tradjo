import type { ExchangeConnection } from "@prisma/client";

export function canHardDeleteExchangeConnection(
  connection: Pick<ExchangeConnection, "deletedAt"> & { syncSources: unknown[] }
) {
  return connection.deletedAt === null && connection.syncSources.length === 0;
}

export function maskSecret(value: string) {
  if (value.length <= 4) {
    return "****";
  }

  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}
