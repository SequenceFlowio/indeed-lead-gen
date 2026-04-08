import { qualifyLead, generateEmail, findContactEmail, isValidEmail } from "@/lib/openai";
import { sendEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  });
}

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  const authorized =
    isVercelCron ||
    (process.env.CRON_SECRET &&
      (authHeader === `Bearer ${process.env.CRON_SECRET}` ||
        secret === process.env.CRON_SECRET));

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const scraperUrl = process.env.SCRAPER_URL;

  if (!scraperUrl) {
    return NextResponse.json({ error: "SCRAPER_URL not configured" }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Return env info immediately for debugging
  return NextResponse.json({
    debug: true,
    supabaseUrl: supabaseUrl?.slice(0, 40),
    hasServiceKey: !!serviceKey,
    serviceKeySuffix: serviceKey?.slice(-6),
    scraperUrl: process.env.SCRAPER_URL?.slice(0, 30),
  });

  // eslint-disable-next-line no-unreachable
  const { data: queries, error: qError } = await supabase
    .from("search_queries")
    .select("*")
    .eq("active", true);

  if (qError || !queries || queries.length === 0) {
    return NextResponse.json({ error: "Geen actieve zoekopdrachten gevonden" }, { status: 400 });
  }

  // Load settings
  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["auto_mode", "min_score_threshold", "company_blocklist"]);

  const kvMap = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const autoMode = kvMap["auto_mode"] ?? "off";
  const minScore = parseInt(kvMap["min_score_threshold"] ?? "6");

  // Blocklist
  const DEFAULT_BLOCKLIST = ["dhl","postnl","dpd","ups","fedex","tnt","albert heijn","jumbo","lidl","aldi","ikea","h&m","bol.com","coolblue","zalando","deloitte","kpmg","pwc","accenture","randstad","adecco","manpower","tempo-team","amazon","action","hema","ah","ahold","heineken","shell","philips","unilever","ns","transdev","arriva","connexxion","gemeente","provincie","rijksoverheid","ministerie","politie","defensie"];
  const userBlocklist = (kvMap["company_blocklist"] ?? "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const blocklist = [...DEFAULT_BLOCKLIST, ...userBlocklist];
  function isBlocked(company: string | null) {
    if (!company) return false;
    const lower = company.toLowerCase();
    return blocklist.some((t) => lower.includes(t));
  }

  const exclusionTerms = blocklist.filter((t) => !t.includes(" ")).slice(0, 20).map((t) => `-${t}`).join(" ");
  const scrapeStartedAt = new Date().toISOString();
  let totalScraped = 0, totalInserted = 0, totalSkipped = 0, totalBlocked = 0;
  const errors: string[] = [];

  for (const q of queries) {
    try {
      const res = await fetch(scraperUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: exclusionTerms ? `${q.query} ${exclusionTerms}` : q.query,
          location: "Nederland",
          limit: 50,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!res.ok) { errors.push(`${q.query}: HTTP ${res.status}`); continue; }
      const jobs: ScraperJob[] = await res.json();
      if (!Array.isArray(jobs)) continue;

      const filtered = jobs.filter((j) => !isBlocked(j.company ?? null));
      totalBlocked += jobs.length - filtered.length;
      totalScraped += filtered.length;

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
        user_id: q.user_id ?? null,
      })).filter((l) => l.job_id !== null);

      if (leads.length === 0) continue;

      const { data: inserted, error: upsertError } = await supabase
        .from("leads")
        .upsert(leads, { onConflict: "job_id", ignoreDuplicates: true })
        .select("id");

      if (upsertError) {
        errors.push(`${q.query}: ${upsertError.message}`);
      } else {
        totalInserted += inserted?.length ?? 0;
        totalSkipped += leads.length - (inserted?.length ?? 0);
      }
    } catch (err) {
      errors.push(`${q.query}: ${err instanceof Error ? err.message : "fout"}`);
    }
  }

  // Auto-mode: qualify + email
  if (autoMode !== "off" && totalInserted > 0) {
    const { data: newLeads } = await supabase.from("leads").select("*").eq("status", "new").gte("scraped_at", scrapeStartedAt);
    const { data: smtpAccounts } = await supabase.from("email_accounts").select("*").eq("active", true).order("last_used_at", { ascending: true, nullsFirst: true });
    let accountIndex = 0;

    for (const lead of newLeads ?? []) {
      try {
        const qualResult = await qualifyLead(lead);
        const isGood = qualResult.score >= minScore;
        await supabase.from("leads").update({
          ai_score: qualResult.score, ai_tier: qualResult.tier, ai_reasoning: qualResult.reasoning,
          ai_key_selling_point: qualResult.key_selling_point, ai_monthly_cost_est: qualResult.estimated_monthly_cost,
          ai_company_size: qualResult.company_size_estimate, ai_best_flow: qualResult.best_flow,
          ai_best_pitch: qualResult.best_pitch,
          status: isGood ? "qualified" : "rejected",
          qualified_at: isGood ? new Date().toISOString() : null,
          rejected_at: isGood ? null : new Date().toISOString(),
        }).eq("id", lead.id);

        if (!isGood || !smtpAccounts?.length) continue;
        const account = smtpAccounts[accountIndex % smtpAccounts.length];
        accountIndex++;
        const qualifiedLead = { ...lead, ...qualResult, status: "qualified" as const };
        const [emailResult, contactResult] = await Promise.all([
          generateEmail(qualifiedLead, account.from_name, account.from_email),
          findContactEmail(lead.company ?? "", lead.location, lead.title),
        ]);
        const emailValid = contactResult.email && isValidEmail(contactResult.email);
        await supabase.from("leads").update({
          draft_subject: emailResult.subject, draft_email: emailResult.body,
          contact_email: emailValid ? contactResult.email : null,
          email_confidence: contactResult.confidence, status: "email_ready",
        }).eq("id", lead.id);

        if (autoMode === "send" && emailValid && contactResult.email) {
          const sendResult = await sendEmail(contactResult.email, emailResult.subject, emailResult.body, lead.id, lead);
          if (sendResult.success) {
            await supabase.from("leads").update({ status: "sent", email_sent_at: new Date().toISOString(), sent_from_email: sendResult.from_email }).eq("id", lead.id);
          }
        }
      } catch (err) {
        console.error(`[cron/scrape] auto-mode error lead ${lead.id}:`, err);
      }
    }
  }

  return NextResponse.json({
    scraped: totalScraped,
    inserted: totalInserted,
    skipped: totalSkipped,
    blocked: totalBlocked,
    queries: queries.length,
    errors: errors.length ? errors : undefined,
  });
}
