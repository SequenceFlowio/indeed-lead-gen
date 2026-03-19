import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Check if scrape is due
  const { data: nextScrapeRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "next_scrape_at")
    .single();

  const { data: scheduleRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scrape_schedule")
    .single();

  const schedule = scheduleRow?.value ?? "off";
  if (schedule === "off") {
    return NextResponse.json({ message: "Scheduler is uitgeschakeld" }, { status: 200 });
  }

  if (nextScrapeRow?.value) {
    const nextScrape = new Date(nextScrapeRow.value);
    if (new Date() < nextScrape) {
      return NextResponse.json(
        { message: "Nog niet aan de beurt", next: nextScrapeRow.value },
        { status: 429 }
      );
    }
  }

  // Trigger scrape via internal call
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/scrape`, { method: "POST" });
  const result = await res.json();

  return NextResponse.json(result);
}
