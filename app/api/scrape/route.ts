import { createClient } from "@/lib/supabase/server";
import { qualifyLead, generateEmail, findContactEmail, isValidEmail } from "@/lib/openai";
import { sendEmail } from "@/lib/mailer";
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

  // Dynamic limit calculation based on real Webshare bandwidth + schedule
  const { data: settings } = await supabase.from("settings").select("key, value").in("key", ["scrape_schedule", "company_blocklist"]);
  const kvMap = Object.fromEntries((settings ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const scheduleHours = parseInt(kvMap["scrape_schedule"] ?? "24");
  const runsPerMonth = scheduleHours > 0 ? Math.round((30 * 24) / scheduleHours) : 30;
  const KB_PER_RESULT = 150;

  // Company blocklist — case-insensitive partial match
  const DEFAULT_BLOCKLIST = ["dhl","postnl","dpd","ups","fedex","tnt","albert heijn","jumbo","lidl","aldi","ikea","h&m","bol.com","coolblue","zalando","deloitte","kpmg","pwc","accenture","randstad","adecco","manpower","tempo-team","amazon","action","hema","ah","ahold","heineken","shell","philips","unilever","ns","transdev","arriva","connexxion","gemeente","provincie","rijksoverheid","ministerie","politie","defensie"];
  const blocklistRaw = kvMap["company_blocklist"] ?? "";
  const userBlocklist = blocklistRaw ? blocklistRaw.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean) : [];
  const blocklist = [...DEFAULT_BLOCKLIST, ...userBlocklist];

  function isBlocked(company: string | null): boolean {
    if (!company) return false;
    const lower = company.toLowerCase();
    return blocklist.some((term) => lower.includes(term));
  }

  // Try to get real bandwidth data from Webshare
  let budgetMb = 1000; // fallback default
  try {
    const wsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/webshare/stats`);
    if (wsRes.ok) {
      const ws = await wsRes.json();
      if (ws.unlimited) {
        budgetMb = 999999;
      } else if (ws.limit_mb) {
        // Use remaining bandwidth for this billing period to avoid overage
        budgetMb = ws.remaining_mb ?? ws.limit_mb;
      }
    }
  } catch {
    // Webshare API unavailable — use fallback
  }

  const limitPerQuery = Math.max(1, Math.min(50, Math.floor((budgetMb * 1000) / (runsPerMonth * queries.length * KB_PER_RESULT))));

  // Build Indeed query exclusions from blocklist (single-word terms only — multi-word need quotes and may be less reliable)
  // Cap at 20 terms to avoid overly long queries
  const exclusionTerms = blocklist
    .filter((term) => !term.includes(" "))   // single-word only for reliability
    .slice(0, 20)
    .map((term) => `-${term}`)
    .join(" ");

  const scrapeStartedAt = new Date().toISOString();
  let totalScraped = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalBlocked = 0;
  const errors: string[] = [];

  for (const q of queries) {
    try {
      const res = await fetch(scraperUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: exclusionTerms ? `${q.query} ${exclusionTerms}` : q.query,
          location: "Nederland",
          limit: limitPerQuery,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!res.ok) {
        errors.push(`Query "${q.query}": HTTP ${res.status}`);
        continue;
      }

      const jobs: ScraperJob[] = await res.json();
      if (!Array.isArray(jobs)) continue;

      // Filter out blocked companies before processing
      const filtered = jobs.filter((job) => !isBlocked(job.company ?? null));
      totalBlocked += jobs.length - filtered.length;
      totalScraped += filtered.length;

      // Parse jobs — same mapping as WF1 Code: Parse Jobs node
      const leads = filtered.map((job) => ({
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

  // Auto-qualify newly inserted leads
  if (totalInserted > 0) {
    const { data: autoModeRow } = await supabase.from("settings").select("value").eq("key", "auto_mode").maybeSingle();
    const autoMode = autoModeRow?.value ?? "off";

    if (autoMode !== "off") {
      const { data: newLeads } = await supabase.from("leads").select("*").eq("status", "new").gte("scraped_at", scrapeStartedAt);

      if (newLeads && newLeads.length > 0) {
        const { data: minScoreRow } = await supabase.from("settings").select("value").eq("key", "min_score_threshold").maybeSingle();
        const minScore = parseInt(minScoreRow?.value ?? "6");

        const { data: smtpAccounts } = await supabase.from("email_accounts").select("*").eq("active", true).order("last_used_at", { ascending: true, nullsFirst: true });

        let accountIndex = 0;
        for (const lead of newLeads) {
          try {
            const qualResult = await qualifyLead(lead);
            const isGood = qualResult.score >= minScore;

            await supabase.from("leads").update({
              ai_score: qualResult.score,
              ai_tier: qualResult.tier,
              ai_reasoning: qualResult.reasoning,
              ai_key_selling_point: qualResult.key_selling_point,
              ai_monthly_cost_est: qualResult.estimated_monthly_cost,
              ai_company_size: qualResult.company_size_estimate,
              ai_best_flow: qualResult.best_flow,
              ai_best_pitch: qualResult.best_pitch,
              status: isGood ? "qualified" : "rejected",
              qualified_at: isGood ? new Date().toISOString() : null,
              rejected_at: isGood ? null : new Date().toISOString(),
            }).eq("id", lead.id);

            if (!isGood || !smtpAccounts || smtpAccounts.length === 0) continue;

            const account = smtpAccounts[accountIndex % smtpAccounts.length];
            accountIndex++;

            const qualifiedLead = { ...lead, ...qualResult, status: "qualified" as const };
            const [emailResult, contactResult] = await Promise.all([
              generateEmail(qualifiedLead, account.from_name, account.from_email),
              findContactEmail(lead.company ?? "", lead.location, lead.title),
            ]);

            const emailValid = contactResult.email && isValidEmail(contactResult.email);

            await supabase.from("leads").update({
              draft_subject: emailResult.subject,
              draft_email: emailResult.body,
              contact_email: emailValid ? contactResult.email : null,
              email_confidence: contactResult.confidence,
              status: "email_ready",
            }).eq("id", lead.id);

            if (autoMode === "send" && emailValid && contactResult.email) {
              const sendResult = await sendEmail(contactResult.email, emailResult.subject, emailResult.body, lead.id, lead);
              if (sendResult.success) {
                await supabase.from("leads").update({
                  status: "sent",
                  email_sent_at: new Date().toISOString(),
                  sent_from_email: sendResult.from_email,
                }).eq("id", lead.id);
              }
            }
          } catch (err) {
            console.error(`[scrape] auto-qualify error for lead ${lead.id}:`, err);
          }
        }
      }
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
    blocked: totalBlocked,
    queries: queries.length,
    limit_per_query: limitPerQuery,
    errors: errors.length > 0 ? errors : undefined,
  });
}
