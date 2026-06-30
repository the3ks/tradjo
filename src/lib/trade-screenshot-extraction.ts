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
const openAiResponseSchema = z.object({
  output: z.array(
    z.object({
      content: z
        .array(
          z.object({
            text: z.string().optional()
          })
        )
        .optional()
    })
  )
});
const openAiDraftResponseSchema = z
  .object({
    trades: extractedTradeDraftsSchema
  })
  .transform((value) => value.trades);

export class TradeExtractionError extends Error {
  provider: "GEMINI" | "OPENAI";
  status: number;

  constructor({
    message,
    provider,
    status
  }: {
    message: string;
    provider: "GEMINI" | "OPENAI";
    status: number;
  }) {
    super(message);
    this.name = "TradeExtractionError";
    this.provider = provider;
    this.status = status;
  }

  get transient() {
    return this.status === 429 || this.status === 500 || this.status === 503 || this.status === 504;
  }
}

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
    throw new TradeExtractionError({
      message: `Gemini extraction failed (${response.status}): ${message}`,
      provider: "GEMINI",
      status: response.status
    });
  }

  const payload = geminiResponseSchema.parse(await response.json());
  const text = payload.candidates[0].content.parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  const parsedJson = JSON.parse(stripJsonFence(text)) as unknown;

  return extractedTradeDraftsSchema.parse(parsedJson);
}

export async function extractTradeDraftWithOpenAI({
  apiKey,
  imageBase64,
  mimeType
}: {
  apiKey: string;
  imageBase64: string;
  mimeType: string;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content: [
            {
              text: openAiExtractionPrompt,
              type: "input_text"
            },
            {
              detail: "auto",
              image_url: `data:${mimeType};base64,${imageBase64}`,
              type: "input_image"
            }
          ],
          role: "user"
        }
      ],
      max_output_tokens: 2500,
      model: "gpt-4.1-nano",
      store: false,
      text: {
        format: {
          type: "json_object"
        }
      },
      temperature: 0
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new TradeExtractionError({
      message: `OpenAI extraction failed (${response.status}): ${message}`,
      provider: "OPENAI",
      status: response.status
    });
  }

  const payload = openAiResponseSchema.parse(await response.json());
  const text = payload.output
    .flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  const parsedJson = JSON.parse(stripJsonFence(text)) as unknown;

  return openAiDraftResponseSchema.parse(parsedJson);
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

const openAiExtractionPrompt = `${extractionPrompt}

For OpenAI JSON mode, return only this JSON object:
{
  "trades": [
    // extracted trade objects matching the schema above
  ]
}
`;

function stripJsonFence(value: string) {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
