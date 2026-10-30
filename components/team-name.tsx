"use client";

import { useOrganization } from "@clerk/nextjs";

export function TeamName({ fallback }: { fallback: string }) {
  const { organization } = useOrganization();
  return <>{organization?.name ?? fallback}</>;
}
