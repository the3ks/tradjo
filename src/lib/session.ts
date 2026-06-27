import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function requireUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user.id;
}
