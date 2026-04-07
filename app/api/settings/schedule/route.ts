import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function nextCronBoundary(): Date {
  // Cron fires every hour — next fire is at the top of the next hour
  const next = new Date();
  next.setUTCMinutes(0, 0, 0);
  next.setTime(next.getTime() + 60 * 60 * 1000);
  return next;
}

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["scrape_schedule", "next_scrape_at"]);
  const kv = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const schedule = kv["scrape_schedule"] ?? "off";
  let next_scrape_at: string | null = null;
  if (schedule !== "off") {
    const stored = kv["next_scrape_at"];
    const storedDate = stored ? new Date(stored) : null;
    // If stored value is in the future use it, otherwise show next cron boundary
    next_scrape_at = storedDate && storedDate > new Date()
      ? storedDate.toISOString()
      : nextCronBoundary().toISOString();
  }
  return NextResponse.json({ schedule, next_scrape_at });
}

export async function POST(request: Request) {
  const { schedule } = await request.json();
  const supabase = await createClient();

  // Set next_scrape_at to NOW so the very next cron fire runs immediately
  const next_scrape_at = schedule === "off" ? null : new Date().toISOString();

  const upserts = [
    { key: "scrape_schedule", value: schedule, updated_at: new Date().toISOString() },
    { key: "next_scrape_at", value: next_scrape_at ?? "", updated_at: new Date().toISOString() },
  ];

  const { error: upsertError } = await supabase.from("settings").upsert(upserts, { onConflict: "key" });
  console.log("[settings/schedule POST]", { schedule, upsertError: upsertError?.message ?? null });

  // Verify what was actually saved
  const { data: verify } = await supabase.from("settings").select("key, value").eq("key", "scrape_schedule");
  console.log("[settings/schedule POST] verify read", verify);

  const display_next = schedule === "off" ? null : nextCronBoundary().toISOString();
  return NextResponse.json({ schedule, next_scrape_at: display_next });
}
