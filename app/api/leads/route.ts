import { NextRequest, NextResponse } from "next/server";
import { createLeads, listLeads } from "@/lib/service";
import { LeadInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const leads = await listLeads();
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const inputs: LeadInput[] = Array.isArray(body)
    ? (body as LeadInput[])
    : [body as LeadInput];

  if (inputs.some((i) => !i || typeof i.name !== "string" || !i.name.trim())) {
    return NextResponse.json({ error: "Jeder Lead braucht ein 'name'-Feld" }, { status: 400 });
  }

  const result = await createLeads(inputs);
  return NextResponse.json(result, { status: 201 });
}
