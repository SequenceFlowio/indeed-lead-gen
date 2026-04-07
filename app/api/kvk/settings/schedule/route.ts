import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function nextCronBoundary(): Date {
  const next = new Date();
  next.setUTCMinutes(0, 0, 0);
  next.setTime(next.getTime() + 60 * 60 * 1000);
  return next;
}

async function upsertSetting(supabase: Awaited<ReturnType<typeof createClient>>, key: string, value: string) {
  const { data: existing } = await supabase.from("settings").select("key").eq("key", key).maybeSingle();
  if (existing) {
    await supabase.from("settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
  } else {
    await supabase.from("settings").insert({ key, value, updated_at: new Date().toISOString() });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["kvk_scrape_schedule", "kvk_next_scrape_at"]);
  const kv = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const schedule = kv["kvk_scrape_schedule"] ?? "off";
  let next_scrape_at: string | null = null;
  if (schedule !== "off") {
    const stored = kv["kvk_next_scrape_at"];
    const storedDate = stored ? new Date(stored) : null;
    next_scrape_at = storedDate && storedDate > new Date()
      ? storedDate.toISOString()
      : nextCronBoundary().toISOString();
  }
  return NextResponse.json({ schedule, next_scrape_at });
}

export async function POST(request: Request) {
  const { schedule } = await request.json();
  const supabase = await createClient();

  const next_scrape_at = schedule === "off" ? null : new Date().toISOString();

  await upsertSetting(supabase, "kvk_scrape_schedule", schedule);
  await upsertSetting(supabase, "kvk_next_scrape_at", next_scrape_at ?? "");

  const display_next = schedule === "off" ? null : nextCronBoundary().toISOString();
  return NextResponse.json({ schedule, next_scrape_at: display_next });
}
