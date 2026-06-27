import { createHmac } from "crypto";

export function buildQueryString(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");
}

export function signBingXQuery(queryString: string, apiSecret: string) {
  return createHmac("sha256", apiSecret).update(queryString).digest("hex");
}
