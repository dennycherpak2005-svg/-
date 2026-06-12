import { NextResponse } from "next/server";
import { createLeads } from "@/lib/service";
import { SEED_LEADS } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Lädt Beispiel-Leads, damit das Dashboard nicht leer ist. */
export async function POST() {
  const result = await createLeads(SEED_LEADS);
  return NextResponse.json({ ok: true, ...result });
}
