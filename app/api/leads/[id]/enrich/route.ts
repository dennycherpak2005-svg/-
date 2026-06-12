import { NextRequest, NextResponse } from "next/server";
import { enrichLead } from "@/lib/service";

export const dynamic = "force-dynamic";

/** Reichert einen Lead an: prüft die Website auf Chatbot + Erreichbarkeit. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await enrichLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  return NextResponse.json({ lead });
}
