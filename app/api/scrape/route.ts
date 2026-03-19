import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface ScraperJob {
  id?: string;
  job_id?: string;
  positionName?: string;
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  url?: string;
  postedAt?: string;
  pub_date?: string;
}

export async function POST() {
  const supabase = await createClient();
  const scraperUrl = process.env.SCRAPER_URL;

  if (!scraperUrl) {
    return NextResponse.json(
      { error: "SCRAPER_URL is not configured" },
      { status: 500 }
    );
  }

  // Fetch active search queries
  const { data: queries, error: qError } = await supabase
    .from("search_queries")
    .select("*")
    .eq("active", true);

  if (qError || !queries || queries.length === 0) {
    return NextResponse.json(
      { error: "Geen actieve zoekopdrachten gevonden" },
      { status: 400 }
    );
  }

  // Dynamic limit calculation based on bandwidth budget
  const { data: settings } = await supabase.from("settings").select("key, value").in("key", ["bandwidth_budget_mb", "scrape_schedule"]);
  const kvMap = Object.fromEntries((settings ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const budgetMb = parseFloat(kvMap["bandwidth_budget_mb"] ?? "1000");
  const scheduleHours = parseInt(kvMap["scrape_schedule"] ?? "24");
  const runsPerMonth = scheduleHours > 0 ? Math.round((30 * 24) / scheduleHours) : 30;
  const KB_PER_RESULT = 150;
  const limitPerQuery = Math.max(1, Math.min(50, Math.floor((budgetMb * 1000) / (runsPerMonth * queries.length * KB_PER_RESULT))));

  let totalScraped = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const q of queries) {
    try {
      const res = await fetch(scraperUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q.query,
          location: "Nederland",
          limit: limitPerQuery,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        errors.push(`Query "${q.query}": HTTP ${res.status}`);
        continue;
      }

      const jobs: ScraperJob[] = await res.json();
      if (!Array.isArray(jobs)) continue;

      totalScraped += jobs.length;

      // Parse jobs — same mapping as WF1 Code: Parse Jobs node
      const leads = jobs.map((job) => ({
        job_id: job.id ?? job.job_id ?? null,
        title: job.positionName ?? job.title ?? null,
        company: job.company ?? null,
        location: job.location ?? null,
        salary: job.salary ?? null,
        description: job.description ?? null,
        url: job.url ?? null,
        pub_date: job.postedAt ?? job.pub_date ?? null,
        search_label: q.label ?? q.query,
        sequenceflow_flow: q.flow ?? null,
        sequenceflow_pitch: q.pitch ?? null,
        sequenceflow_angle: q.angle ?? null,
        scraped_at: new Date().toISOString(),
        status: "new" as const,
      })).filter((l) => l.job_id !== null);

      if (leads.length === 0) continue;

      // Upsert — skip existing job_ids
      const { data: inserted, error: upsertError } = await supabase
        .from("leads")
        .upsert(leads, { onConflict: "job_id", ignoreDuplicates: true })
        .select("id");

      if (upsertError) {
        errors.push(`Query "${q.query}": ${upsertError.message}`);
      } else {
        const insertedCount = inserted?.length ?? 0;
        totalInserted += insertedCount;
        totalSkipped += leads.length - insertedCount;
      }
    } catch (err) {
      errors.push(`Query "${q.query}": ${err instanceof Error ? err.message : "Onbekende fout"}`);
    }
  }

  // Update next_scrape_at based on schedule
  if (scheduleHours > 0) {
    const nextScrape = new Date();
    nextScrape.setHours(nextScrape.getHours() + scheduleHours);
    await supabase.from("settings").upsert({
      key: "next_scrape_at",
      value: nextScrape.toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    scraped: totalScraped,
    inserted: totalInserted,
    skipped: totalSkipped,
    queries: queries.length,
    limit_per_query: limitPerQuery,
    errors: errors.length > 0 ? errors : undefined,
  });
}
