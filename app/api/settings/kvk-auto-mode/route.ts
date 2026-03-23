import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "kvk_auto_mode").maybeSingle();
  return NextResponse.json({ value: data?.value ?? "off" });
}

export async function POST(request: Request) {
  const { value } = await request.json();
  const supabase = await createClient();
  await supabase.from("settings").upsert({ key: "kvk_auto_mode", value, updated_at: new Date().toISOString() });
  return NextResponse.json({ value });
}
