import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const tier = searchParams.get("tier");
  const limit = parseInt(searchParams.get("limit") ?? "500");

  let query = supabase
    .from("leads")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (tier) query = query.eq("ai_tier", tier);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase.from("leads").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
