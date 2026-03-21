import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
  }

  if (!lead.contact_email) {
    return NextResponse.json({ error: "Geen e-mailadres opgegeven voor deze lead" }, { status: 400 });
  }

  if (!lead.draft_email) {
    return NextResponse.json({ error: "Geen e-mail concept aanwezig. Genereer eerst een e-mail." }, { status: 400 });
  }

  const result = await sendEmail(
    lead.contact_email,
    lead.draft_subject ?? "(geen onderwerp)",
    lead.draft_email,
    lead.id,
    lead
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update({
      status: "sent",
      email_sent_at: new Date().toISOString(),
      sent_from_email: result.from_email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
