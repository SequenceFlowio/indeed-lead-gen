import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company, error } = await supabase.from("kvk_companies").select("*").eq("id", id).single();
  if (error || !company) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  if (!company.contact_email || !company.draft_subject || !company.draft_email) {
    return NextResponse.json({ error: "Geen e-mail of contactadres beschikbaar" }, { status: 400 });
  }

  const result = await sendEmail(company.contact_email, company.draft_subject, company.draft_email, company.id, undefined);

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Versturen mislukt" }, { status: 500 });
  }

  const { data: updated } = await supabase
    .from("kvk_companies")
    .update({
      status: "sent",
      email_sent_at: new Date().toISOString(),
      sent_from_email: result.from_email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json(updated);
}
