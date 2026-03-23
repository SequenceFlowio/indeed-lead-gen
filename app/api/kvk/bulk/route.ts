import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { ids, status } = await request.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Geen IDs opgegeven" }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("kvk_companies")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: ids.length });
}

export async function DELETE(request: Request) {
  const { ids } = await request.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Geen IDs opgegeven" }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase.from("kvk_companies").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: ids.length });
}
