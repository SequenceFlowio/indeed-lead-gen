import { createClient, createServiceClient } from "@/lib/supabase/server";
import { qualifyKVKCompany, generateKVKEmail, findContactEmail, isValidEmail } from "@/lib/openai";
import { sendEmail } from "@/lib/mailer";
import { searchKVK } from "@/lib/kvk-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  const isInternal = cronSecret && cronSecret === process.env.CRON_SECRET;
  const overrideUserId = isInternal ? request.headers.get("x-user-id") : null;
  const supabase = isInternal ? await createServiceClient() : await createClient();

  // Fetch active KVK search queries
  const { data: queries, error: qError } = await supabase
    .from("kvk_search_queries")
    .select("*")
    .eq("active", true);

  if (qError || !queries || queries.length === 0) {
    return NextResponse.json({ error: "Geen actieve KVK zoekopdrachten gevonden" }, { status: 400 });
  }

  const scrapeStartedAt = new Date().toISOString();
  let totalScraped = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const q of queries) {
    try {
      const sbiList: string[] = q.sbi_codes ?? ["47910"];

      for (const sbi of sbiList) {
        try {
          const companies = await searchKVK(q, sbi);
          totalScraped += companies.length;

          if (companies.length === 0) continue;

          const rows = companies.map((c) => ({
            ...c,
            sbi_codes: [sbi],
            status: "new" as const,
            scraped_at: new Date().toISOString(),
            ...(overrideUserId ? { user_id: overrideUserId } : {}),
          }));

          const { data: inserted, error: upsertError } = await supabase
            .from("kvk_companies")
            .upsert(rows, { onConflict: "kvk_number", ignoreDuplicates: true })
            .select("id");

          if (upsertError) {
            errors.push(`Query "${q.label}" SBI ${sbi}: ${upsertError.message}`);
          } else {
            const insertedCount = inserted?.length ?? 0;
            totalInserted += insertedCount;
            totalSkipped += rows.length - insertedCount;
          }
        } catch (err) {
          errors.push(`Query "${q.label}" SBI ${sbi}: ${err instanceof Error ? err.message : "Fout"}`);
        }
      }
    } catch (err) {
      errors.push(`Query "${q.label}": ${err instanceof Error ? err.message : "Onbekende fout"}`);
    }
  }

  // Auto-qualify newly inserted companies
  if (totalInserted > 0) {
    const { data: autoModeRow } = await supabase.from("settings").select("value").eq("key", "kvk_auto_mode").maybeSingle();
    const autoMode = autoModeRow?.value ?? "off";

    if (autoMode !== "off") {
      const { data: newCompanies } = await supabase
        .from("kvk_companies")
        .select("*")
        .eq("status", "new")
        .gte("scraped_at", scrapeStartedAt);

      if (newCompanies && newCompanies.length > 0) {
        const { data: minScoreRow } = await supabase.from("settings").select("value").eq("key", "kvk_min_score_threshold").maybeSingle();
        const minScore = parseInt(minScoreRow?.value ?? "6");

        const { data: smtpAccounts } = await supabase
          .from("email_accounts")
          .select("*")
          .eq("active", true)
          .order("last_used_at", { ascending: true, nullsFirst: true });

        let accountIndex = 0;

        for (const company of newCompanies) {
          try {
            const qualResult = await qualifyKVKCompany(company);
            const isGood = qualResult.score >= minScore;

            await supabase.from("kvk_companies").update({
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
              updated_at: new Date().toISOString(),
            }).eq("id", company.id);

            if (!isGood || !smtpAccounts || smtpAccounts.length === 0) continue;

            const account = smtpAccounts[accountIndex % smtpAccounts.length];
            accountIndex++;

            const qualifiedCompany = { ...company, ...qualResult };
            const [emailResult, contactResult] = await Promise.all([
              generateKVKEmail(qualifiedCompany, account.from_name, account.from_email),
              findContactEmail(company.name ?? "", company.city, null),
            ]);

            const emailValid = contactResult.email && isValidEmail(contactResult.email);

            await supabase.from("kvk_companies").update({
              draft_subject: emailResult.subject,
              draft_email: emailResult.body,
              contact_email: emailValid ? contactResult.email : null,
              email_confidence: contactResult.confidence,
              status: "email_ready",
              updated_at: new Date().toISOString(),
            }).eq("id", company.id);

            if (autoMode === "send" && emailValid && contactResult.email) {
              const sendResult = await sendEmail(contactResult.email, emailResult.subject, emailResult.body, company.id, null);
              if (sendResult.success) {
                await supabase.from("kvk_companies").update({
                  status: "sent",
                  email_sent_at: new Date().toISOString(),
                  sent_from_email: sendResult.from_email,
                  updated_at: new Date().toISOString(),
                }).eq("id", company.id);
              }
            }
          } catch (err) {
            console.error(`[kvk/scrape] auto-qualify error for company ${company.id}:`, err);
          }
        }
      }
    }
  }

  // Update kvk_next_scrape_at
  const { data: scheduleRow } = await supabase.from("settings").select("value").eq("key", "kvk_scrape_schedule").maybeSingle();
  const scheduleHours = parseInt(scheduleRow?.value ?? "0");
  if (scheduleHours > 0) {
    const nextScrape = new Date();
    nextScrape.setHours(nextScrape.getHours() + scheduleHours);
    await supabase.from("settings").upsert({
      key: "kvk_next_scrape_at",
      value: nextScrape.toISOString(),
      updated_at: new Date().toISOString(),
      ...(overrideUserId ? { user_id: overrideUserId } : {}),
    });
  }

  return NextResponse.json({
    scraped: totalScraped,
    inserted: totalInserted,
    skipped: totalSkipped,
    queries: queries.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
