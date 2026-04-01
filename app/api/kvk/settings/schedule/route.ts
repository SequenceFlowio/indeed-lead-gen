import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value").eq("key", "kvk_scrape_schedule");
  const kv = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const schedule = kv["kvk_scrape_schedule"] ?? "off";
  const next_scrape_at = schedule !== "off"
    ? (() => {
        const next = new Date();
        next.setUTCHours(8, 0, 0, 0);
        if (next <= new Date()) next.setUTCDate(next.getUTCDate() + 1);
        return next.toISOString();
      })()
    : null;
  return NextResponse.json({ schedule, next_scrape_at });
}

export async function POST(request: Request) {
  const { schedule } = await request.json();
  const supabase = await createClient();

  const next_scrape_at = schedule === "off"
    ? null
    : (() => {
        const next = new Date();
        next.setUTCHours(8, 0, 0, 0);
        if (next <= new Date()) next.setUTCDate(next.getUTCDate() + 1);
        return next.toISOString();
      })();

  const upserts = [
    { key: "kvk_scrape_schedule", value: schedule, updated_at: new Date().toISOString() },
    ...(next_scrape_at !== null
      ? [{ key: "kvk_next_scrape_at", value: next_scrape_at, updated_at: new Date().toISOString() }]
      : [{ key: "kvk_next_scrape_at", value: "", updated_at: new Date().toISOString() }]),
  ];

  await supabase.from("settings").upsert(upserts, { onConflict: "key" });
  return NextResponse.json({ schedule, next_scrape_at });
}
