export type CollectionKind = "FOLDER" | "TRADING";

export function canContainChildren(type: CollectionKind) {
  return type === "FOLDER";
}

export function canContainTrades(type: CollectionKind) {
  return type === "TRADING";
}

export function canHaveSyncSource(type: CollectionKind) {
  return type === "TRADING";
}
