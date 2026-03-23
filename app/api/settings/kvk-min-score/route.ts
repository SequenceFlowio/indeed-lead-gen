import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "kvk_min_score_threshold").maybeSingle();
  return NextResponse.json({ value: data?.value ?? "6" });
}

export async function POST(request: Request) {
  const { value } = await request.json();
  const supabase = await createClient();
  await supabase.from("settings").upsert({ key: "kvk_min_score_threshold", value, updated_at: new Date().toISOString() });
  return NextResponse.json({ value });
}
