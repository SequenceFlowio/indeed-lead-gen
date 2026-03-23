import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["kvk_scrape_schedule", "kvk_next_scrape_at"]);
  const kv = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const schedule = kv["kvk_scrape_schedule"] ?? "off";
  const rawNext = kv["kvk_next_scrape_at"];
  const next_scrape_at = (schedule !== "off" && rawNext) ? rawNext : null;
  return NextResponse.json({ schedule, next_scrape_at });
}

export async function POST(request: Request) {
  const { schedule } = await request.json();
  const supabase = await createClient();

  const hours = parseInt(schedule);
  const next_scrape_at = isNaN(hours) || schedule === "off"
    ? null
    : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const upserts = [
    { key: "kvk_scrape_schedule", value: schedule, updated_at: new Date().toISOString() },
    ...(next_scrape_at !== null
      ? [{ key: "kvk_next_scrape_at", value: next_scrape_at, updated_at: new Date().toISOString() }]
      : [{ key: "kvk_next_scrape_at", value: "", updated_at: new Date().toISOString() }]),
  ];

  await supabase.from("settings").upsert(upserts);
  return NextResponse.json({ schedule, next_scrape_at });
}
