import { z } from "zod";

export const extractedTradeDraftSchema = z.object({
  screenType: z.enum(["OPEN_POSITION", "CLOSED_TRADE", "UNKNOWN"]),
  exchange: z.literal("BINGX").default("BINGX"),
  marketType: z.literal("FUTURES").default("FUTURES"),
  symbol: z.string().trim().nullable().default(null),
  side: z.enum(["LONG", "SHORT"]).nullable().default(null),
  marginMode: z.enum(["ISOLATED", "CROSS"]).nullable().default(null),
  leverage: z.number().nullable().default(null),
  entryPrice: z.number().nullable().default(null),
  currentPrice: z.number().nullable().default(null),
  closePrice: z.number().nullable().default(null),
  positionSize: z.number().nullable().default(null),
  positionUnit: z.string().trim().nullable().default(null),
  margin: z.number().nullable().default(null),
  totalVolume: z.number().nullable().default(null),
  unrealizedPnl: z.number().nullable().default(null),
  unrealizedPnlPercent: z.number().nullable().default(null),
  realizedPnl: z.number().nullable().default(null),
  realizedPnlPercent: z.number().nullable().default(null),
  liquidationPrice: z.number().nullable().default(null),
  takeProfit: z.number().nullable().default(null),
  stopLoss: z.number().nullable().default(null),
  fundingFee: z.number().nullable().default(null),
  tradingFee: z.number().nullable().default(null),
  openTime: z.string().trim().nullable().default(null),
  closeTime: z.string().trim().nullable().default(null),
  screenshotTime: z.string().trim().nullable().default(null),
  orderNo: z.string().trim().nullable().default(null),
  orderType: z.string().trim().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0),
  warnings: z.array(z.string().trim()).default([])
});

export type ExtractedTradeDraft = z.infer<typeof extractedTradeDraftSchema>;

export const extractedTradeDraftsSchema = z
  .union([extractedTradeDraftSchema, z.array(extractedTradeDraftSchema)])
  .transform((value) => (Array.isArray(value) ? value : [value]));

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional()
            })
          )
        })
      })
    )
    .min(1)
});

export async function extractTradeDraftWithGemini({
  apiKey,
  imageBase64,
  mimeType
}: {
  apiKey: string;
  imageBase64: string;
  mimeType: string;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: extractionPrompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json"
        }
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini extraction failed (${response.status}): ${message}`);
  }

  const payload = geminiResponseSchema.parse(await response.json());
  const text = payload.candidates[0].content.parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  const parsedJson = JSON.parse(stripJsonFence(text)) as unknown;

  return extractedTradeDraftsSchema.parse(parsedJson);
}

const extractionPrompt = `
Extract all BingX Standard Futures trades visible in this mobile screenshot.

Return only a JSON array. Each array item must match this shape:
{
  "screenType": "OPEN_POSITION" | "CLOSED_TRADE" | "UNKNOWN",
  "exchange": "BINGX",
  "marketType": "FUTURES",
  "symbol": string | null,
  "side": "LONG" | "SHORT" | null,
  "marginMode": "ISOLATED" | "CROSS" | null,
  "leverage": number | null,
  "entryPrice": number | null,
  "currentPrice": number | null,
  "closePrice": number | null,
  "positionSize": number | null,
  "positionUnit": string | null,
  "margin": number | null,
  "totalVolume": number | null,
  "unrealizedPnl": number | null,
  "unrealizedPnlPercent": number | null,
  "realizedPnl": number | null,
  "realizedPnlPercent": number | null,
  "liquidationPrice": number | null,
  "takeProfit": number | null,
  "stopLoss": number | null,
  "fundingFee": number | null,
  "tradingFee": number | null,
  "openTime": string | null,
  "closeTime": string | null,
  "screenshotTime": string | null,
  "orderNo": string | null,
  "orderType": string | null,
  "confidence": number,
  "warnings": string[]
}

Rules:
- Use OPEN_POSITION when the screenshot shows an active position with Last Price, Est. Liq. Price, or Close button.
- Use CLOSED_TRADE when it shows Close Price, Trading Fee, Open Time, Close Time, or Closed manually.
- If multiple trades are visible, return one array item per trade.
- If no trade is visible, return one UNKNOWN item.
- Convert comma-formatted numbers to plain numbers.
- Convert percentage values to numbers without the percent sign.
- Use null for "--", missing, hidden, cropped, or unreadable values.
- Do not infer a field that is not visible.
- Put uncertainty into warnings and lower confidence.
`;

function stripJsonFence(value: string) {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
