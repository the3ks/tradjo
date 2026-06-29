import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { ScreenshotImporter } from "@/components/trades/screenshot-importer";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export default async function ImportScreenshotPage() {
  const userId = await requireUserId();
  const geminiCredential = await prisma.userAiCredential.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "GEMINI"
      }
    },
    select: { id: true }
  });

  return (
    <>
      <PageHeader
        title="Import screenshot"
        description="Extract a BingX Standard Futures trade from a mobile screenshot using your Gemini API key."
      />
      <div className="grid gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <Link className="text-sm font-semibold text-accent" href="/trades">
            Back to trades
          </Link>
          <Link className="text-sm font-semibold text-accent" href="/settings">
            Gemini settings
          </Link>
        </div>
        <ScreenshotImporter hasGeminiKey={Boolean(geminiCredential)} />
      </div>
    </>
  );
}
