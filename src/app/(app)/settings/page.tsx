import { redirect } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { GeminiCredentialForm } from "@/components/settings/gemini-credential-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [profile, geminiCredential] = await Promise.all([
    prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        timezone: "UTC",
        baseCurrency: "USD"
      },
      update: {}
    }),
    prisma.userAiCredential.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: "GEMINI"
        }
      },
      select: { id: true }
    })
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage profile defaults used by sync ranges, reporting, and currency display."
      />
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold">Profile</h2>
            <p className="mt-2 text-sm text-muted">
              These settings are scoped to your user account.
            </p>
            <div className="mt-6">
              <ProfileForm
                timezone={profile.timezone}
                baseCurrency={profile.baseCurrency}
              />
            </div>
          </section>
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold">AI extraction</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Add your paid Gemini API key to extract BingX Standard Futures trades from mobile screenshots.
            </p>
            <div className="mt-6">
              <GeminiCredentialForm hasCredential={Boolean(geminiCredential)} />
            </div>
          </section>
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold">Exchange connections</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Add and manage encrypted BingX API credentials for manual sync.
            </p>
            <Link
              className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition hover:bg-surface-elevated active:translate-y-px"
              href="/settings/exchanges"
            >
              Manage exchanges
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
