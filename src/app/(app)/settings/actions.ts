"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, signOut } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/secret-crypto";

const profileSchema = z.object({
  timezone: z.string().trim().min(1).max(80),
  baseCurrency: z.string().trim().min(3).max(8).transform((value) => value.toUpperCase())
});

const geminiCredentialSchema = z.object({
  apiKey: z.string().trim().min(10).max(500)
});

export type SettingsActionState = {
  error?: string;
  success?: string;
};

export async function updateProfileAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = profileSchema.safeParse({
    timezone: formData.get("timezone"),
    baseCurrency: formData.get("baseCurrency")
  });

  if (!parsed.success) {
    return { error: "Enter a timezone and base currency." };
  }

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      timezone: parsed.data.timezone,
      baseCurrency: parsed.data.baseCurrency
    },
    update: {
      timezone: parsed.data.timezone,
      baseCurrency: parsed.data.baseCurrency
    }
  });

  revalidatePath("/settings");

  return { success: "Profile saved." };
}

export async function saveGeminiCredentialAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = geminiCredentialSchema.safeParse({
    apiKey: formData.get("apiKey")
  });

  if (!parsed.success) {
    return { error: "Enter a valid Gemini API key." };
  }

  await prisma.userAiCredential.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: "GEMINI"
      }
    },
    create: {
      userId: session.user.id,
      provider: "GEMINI",
      apiKeyEncrypted: encryptSecret(parsed.data.apiKey, getEnv().ENCRYPTION_KEY)
    },
    update: {
      apiKeyEncrypted: encryptSecret(parsed.data.apiKey, getEnv().ENCRYPTION_KEY)
    }
  });

  revalidatePath("/settings");

  return { success: "Gemini API key saved." };
}

export async function deleteGeminiCredentialAction() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  await prisma.userAiCredential.deleteMany({
    where: {
      userId: session.user.id,
      provider: "GEMINI"
    }
  });

  revalidatePath("/settings");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
