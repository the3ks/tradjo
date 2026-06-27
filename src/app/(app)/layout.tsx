import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProtectedAppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const collectionNavItems = await prisma.collection.findMany({
    where: {
      userId: session.user.id
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      isPinned: true,
      name: true,
      parentId: true,
      pinnedAt: true,
      type: true
    }
  });

  return (
    <AppShell collectionNavItems={collectionNavItems} user={session.user}>
      {children}
    </AppShell>
  );
}
