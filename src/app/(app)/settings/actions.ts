"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  timezone: z.string().trim().min(1).max(80),
  baseCurrency: z.string().trim().min(3).max(8).transform((value) => value.toUpperCase())
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

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
