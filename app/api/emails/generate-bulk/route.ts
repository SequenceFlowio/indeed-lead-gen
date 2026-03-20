import { createClient } from "@/lib/supabase/server";
import { generateEmail, findContactEmail, isValidEmail } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { ids } = await req.json() as { ids: string[] };
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  const supabase = await createClient();

  // Check for active SMTP accounts
  const { data: allAccounts } = await supabase
    .from("email_accounts")
    .select("id, from_name, from_email, last_used_at, sent_count")
    .eq("active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true });

  if (!allAccounts || allAccounts.length === 0) {
    return NextResponse.json(
      { error: "Verbind eerst een SMTP-account in de instellingen." },
      { status: 400 }
    );
  }

  const results: { id: string; company: string; success: boolean; error?: string }[] = [];
  let accountIndex = 0;

  for (const id of ids) {
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !lead) {
      results.push({ id, company: "Onbekend", success: false, error: "Lead niet gevonden" });
      continue;
    }

    try {
      // Round-robin through accounts
      const account = allAccounts[accountIndex % allAccounts.length];
      accountIndex++;

      const [emailResult, contactResult] = await Promise.all([
        generateEmail(lead, account.from_name, account.from_email),
        findContactEmail(lead.company ?? "", lead.location),
      ]);

      const emailValid = contactResult.email && isValidEmail(contactResult.email);

      await supabase
        .from("leads")
        .update({
          draft_subject: emailResult.subject,
          draft_email: emailResult.body,
          contact_email: emailValid ? contactResult.email : null,
          email_confidence: contactResult.confidence,
          status: "email_ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      results.push({ id, company: lead.company ?? "—", success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      results.push({ id, company: lead.company ?? "—", success: false, error: message });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    generated: succeeded,
    failed,
    errors: results.filter((r) => !r.success).map((r) => ({ company: r.company, error: r.error })),
  });
}
