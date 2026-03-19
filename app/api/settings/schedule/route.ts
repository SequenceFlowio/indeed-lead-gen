import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value").in("key", ["scrape_schedule", "next_scrape_at"]);
  const kv = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return NextResponse.json({ schedule: kv["scrape_schedule"] ?? "off", next_scrape_at: kv["next_scrape_at"] ?? null });
}

export async function POST(request: Request) {
  const { schedule } = await request.json();
  const supabase = await createClient();

  const hours = parseInt(schedule);
  const next_scrape_at = isNaN(hours) || schedule === "off"
    ? null
    : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const upserts = [
    { key: "scrape_schedule", value: schedule, updated_at: new Date().toISOString() },
    ...(next_scrape_at !== null
      ? [{ key: "next_scrape_at", value: next_scrape_at, updated_at: new Date().toISOString() }]
      : [{ key: "next_scrape_at", value: "", updated_at: new Date().toISOString() }]),
  ];

  await supabase.from("settings").upsert(upserts);
  return NextResponse.json({ schedule, next_scrape_at });
}
