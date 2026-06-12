import { NextRequest, NextResponse } from "next/server";
import { deleteLead, updateLead } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  // Nur erlaubte, vom Nutzer editierbare Felder durchlassen.
  const allowed = [
    "name", "company", "source", "industry", "city", "country",
    "website", "email", "phone", "instagram", "linkedin", "notes", "status",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  const lead = await updateLead(params.id, patch);
  if (!lead) return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = await deleteLead(params.id);
  if (!ok) return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
