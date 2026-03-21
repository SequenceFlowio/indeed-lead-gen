import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { ids, status } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "rejected") {
    updates.rejected_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("leads")
    .update(updates)
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: ids.length });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  const { error } = await supabase.from("leads").delete().in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: ids.length });
}
