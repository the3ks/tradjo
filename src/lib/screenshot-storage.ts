import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getEnv } from "@/lib/env";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export async function saveTradeScreenshotFile({
  file,
  tradeId,
  userId
}: {
  file: File;
  tradeId: string;
  userId: string;
}) {
  if (file.size <= 0) {
    return null;
  }

  if (file.size > MAX_SCREENSHOT_BYTES) {
    throw new Error("Screenshot must be 5MB or smaller.");
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Screenshot must be a JPG, PNG, WebP, or GIF image.");
  }

  const configuredStorageDir = getEnv().SCREENSHOT_STORAGE_DIR;
  const storageRoot = path.isAbsolute(configuredStorageDir)
    ? configuredStorageDir
    : path.join(/*turbopackIgnore: true*/ process.cwd(), configuredStorageDir);
  const tradeDirectory = path.join(storageRoot, userId, tradeId);
  const extension = extensionForMimeType(file.type);
  const fileName = `${randomUUID()}${extension}`;
  const storagePath = path.join(tradeDirectory, fileName);

  await mkdir(tradeDirectory, { recursive: true });
  await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));

  return {
    fileName,
    mimeType: file.type,
    originalName: file.name || fileName,
    sizeBytes: file.size,
    storagePath
  };
}

export type SavedTradeScreenshotFile = NonNullable<
  Awaited<ReturnType<typeof saveTradeScreenshotFile>>
>;

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}
