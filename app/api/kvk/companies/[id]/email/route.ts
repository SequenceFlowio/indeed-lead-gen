import { createClient } from "@/lib/supabase/server";
import { generateKVKEmail, findContactEmail, isValidEmail } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company, error } = await supabase.from("kvk_companies").select("*").eq("id", id).single();
  if (error || !company) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const { data: accounts } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1);

  const account = accounts?.[0];

  const [emailResult, contactResult] = await Promise.all([
    generateKVKEmail(company, account?.from_name, account?.from_email),
    findContactEmail(company.name ?? "", company.city, null),
  ]);

  const emailValid = contactResult.email && isValidEmail(contactResult.email);

  const { data: updated } = await supabase
    .from("kvk_companies")
    .update({
      draft_subject: emailResult.subject,
      draft_email: emailResult.body,
      contact_email: emailValid ? contactResult.email : null,
      email_confidence: contactResult.confidence,
      status: "email_ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json(updated);
}
