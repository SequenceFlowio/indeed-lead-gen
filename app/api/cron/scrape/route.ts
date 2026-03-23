import { createServiceClient } from "@/lib/supabase/server";
import { qualifyLead } from "@/lib/openai";
import { generateEmail, findContactEmail, isValidEmail } from "@/lib/openai";
import { sendEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service client to bypass RLS for cron operations
  const supabase = await createServiceClient();

  // Check schedule settings
  const { data: scheduleRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scrape_schedule")
    .maybeSingle();

  const schedule = scheduleRow?.value ?? "off";
  if (schedule === "off") {
    return NextResponse.json({ message: "Scheduler is uitgeschakeld" }, { status: 200 });
  }

  const { data: nextScrapeRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "next_scrape_at")
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

  // Delete rejected leads older than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("leads")
    .delete()
    .eq("status", "rejected")
    .lt("rejected_at", cutoff);

  // Record time before scrape to identify new leads afterward
  const scrapeStartedAt = new Date().toISOString();

  // Get user_id from search_queries (settings table has no user_id column)
  const { data: queryRow } = await supabase
    .from("search_queries")
    .select("user_id")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  const userId = (queryRow as { user_id?: string } | null)?.user_id ?? null;

  // Trigger scrape via internal call (pass secret + user_id so /api/scrape uses service client)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/scrape`, {
    method: "POST",
    headers: {
      "x-cron-secret": process.env.CRON_SECRET ?? "",
      ...(userId ? { "x-user-id": userId } : {}),
    },
  });
  const result = await res.json();

  // Auto-mode: qualify + optionally generate + send
  const { data: autoModeRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "auto_mode")
    .maybeSingle();

  const autoMode = autoModeRow?.value ?? "off";

  if (autoMode !== "off" && (result.inserted ?? 0) > 0) {
    // Fetch newly inserted leads
    const { data: newLeads } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "new")
      .gte("scraped_at", scrapeStartedAt);

    if (newLeads && newLeads.length > 0) {
      // Get min score threshold
      const { data: minScoreRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "min_score_threshold")
        .maybeSingle();
      const minScore = parseInt(minScoreRow?.value ?? "6");

      // Get active SMTP accounts for round-robin
      const { data: smtpAccounts } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("active", true)
        .order("last_used_at", { ascending: true, nullsFirst: true });

      let accountIndex = 0;

      for (const lead of newLeads) {
        try {
          // Step 1: Qualify
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

          // Skip low-scoring leads for email generation
          if (!isGood) continue;
          if (!smtpAccounts || smtpAccounts.length === 0) continue;

          // Step 2: Generate email
          const account = smtpAccounts[accountIndex % smtpAccounts.length];
          accountIndex++;

          const qualifiedLead = { ...lead, ...qualResult, status: "qualified" };
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

          // Step 3: Auto-send if mode is "send" and we have a valid email
          if (autoMode === "send" && emailValid && contactResult.email) {
            const sendResult = await sendEmail(
              contactResult.email,
              emailResult.subject,
              emailResult.body,
              lead.id,
              lead
            );
            if (sendResult.success) {
              await supabase.from("leads").update({
                status: "sent",
                email_sent_at: new Date().toISOString(),
                sent_from_email: sendResult.from_email,
              }).eq("id", lead.id);
            }
          }
        } catch (err) {
          console.error(`[cron] auto-mode error for lead ${lead.id}:`, err);
        }
      }
    }
  }

  return NextResponse.json({ ...result, auto_mode: autoMode });
}
