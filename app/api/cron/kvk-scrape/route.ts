import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");

  const authorized =
    process.env.CRON_SECRET &&
    (authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      secret === process.env.CRON_SECRET);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Check KVK schedule
  const { data: scheduleRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "kvk_scrape_schedule")
    .maybeSingle();

  const schedule = scheduleRow?.value ?? "off";
  if (schedule === "off") {
    return NextResponse.json({ message: "KVK scheduler is uitgeschakeld" }, { status: 200 });
  }

  const { data: nextScrapeRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "kvk_next_scrape_at")
    .maybeSingle();

  if (nextScrapeRow?.value) {
    const nextScrape = new Date(nextScrapeRow.value);
    if (new Date() < nextScrape) {
      return NextResponse.json(
        { message: "Nog niet aan de beurt", next: nextScrapeRow.value },
        { status: 429 }
      );
    }
  }

  // Delete rejected companies older than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("kvk_companies")
    .delete()
    .eq("status", "rejected")
    .lt("rejected_at", cutoff);

  // Get user_id from kvk_search_queries (settings table has no user_id column)
  const { data: queryRow } = await supabase
    .from("kvk_search_queries")
    .select("user_id")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  const userId = (queryRow as { user_id?: string } | null)?.user_id ?? null;

  // Trigger KVK scrape via internal call
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/kvk/scrape`, {
    method: "POST",
    headers: {
      "x-cron-secret": process.env.CRON_SECRET ?? "",
      ...(userId ? { "x-user-id": userId } : {}),
    },
  });
  const result = await res.json();

  return NextResponse.json(result);
}
