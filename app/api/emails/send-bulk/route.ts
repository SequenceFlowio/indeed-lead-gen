import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Geen leads opgegeven" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .in("id", ids);

  if (error || !leads) {
    return NextResponse.json({ error: error?.message ?? "Leads niet gevonden" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const errors: { id: string; company: string; error: string }[] = [];

  for (const lead of leads) {
    if (!lead.contact_email || !lead.draft_email) {
      failed++;
      errors.push({
        id: lead.id,
        company: lead.company ?? "onbekend",
        error: "Geen e-mailadres of concept",
      });
      continue;
    }

    const result = await sendEmail(
      lead.contact_email,
      lead.draft_subject ?? "(geen onderwerp)",
      lead.draft_email,
      lead.id
    );

    if (result.success) {
      await supabase
        .from("leads")
        .update({
          status: "sent",
          email_sent_at: new Date().toISOString(),
          sent_from_email: result.from_email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      sent++;
    } else {
      failed++;
      errors.push({
        id: lead.id,
        company: lead.company ?? "onbekend",
        error: result.error ?? "Onbekende fout",
      });
    }
  }

  return NextResponse.json({ sent, failed, errors });
}
