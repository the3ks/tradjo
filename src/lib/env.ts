import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),
  ENCRYPTION_KEY: z.string().min(32),
  BINGX_BASE_URL: z.string().url().default("https://open-api.bingx.com"),
  SCREENSHOT_STORAGE_DIR: z.string().min(1).default("./uploads/screenshots")
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(values: NodeJS.ProcessEnv): AppEnv {
  return envSchema.parse({
    DATABASE_URL: values.DATABASE_URL,
    AUTH_SECRET: values.AUTH_SECRET,
    AUTH_URL: values.AUTH_URL,
    ENCRYPTION_KEY: values.ENCRYPTION_KEY,
    BINGX_BASE_URL: values.BINGX_BASE_URL,
    SCREENSHOT_STORAGE_DIR: values.SCREENSHOT_STORAGE_DIR
  });
}

export function getEnv() {
  return parseEnv(process.env);
}
