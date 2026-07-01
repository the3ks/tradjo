import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type ScreenshotRouteProps = {
  params: Promise<{
    screenshotId: string;
  }>;
};

export async function GET(_request: Request, { params }: ScreenshotRouteProps) {
  const [{ screenshotId }, userId] = await Promise.all([params, requireUserId()]);
  const screenshot = await prisma.tradeScreenshot.findFirst({
    where: {
      id: screenshotId,
      userId
    },
    select: {
      mimeType: true,
      storagePath: true
    }
  });

  if (!screenshot) {
    return new NextResponse("Not found", { status: 404 });
  }

  let bytes: Buffer;

  try {
    bytes = await readFile(screenshot.storagePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": screenshot.mimeType,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
