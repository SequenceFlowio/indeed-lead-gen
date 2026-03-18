import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { ids, status } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  const { error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: ids.length });
}
