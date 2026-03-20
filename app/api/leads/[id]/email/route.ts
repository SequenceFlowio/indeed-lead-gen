import { createClient } from "@/lib/supabase/server";
import { generateEmail, findContactEmail, isValidEmail } from "@/lib/openai";
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
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Check for active SMTP account before generating
  const { data: accounts } = await supabase
    .from("email_accounts")
    .select("id, from_name, from_email, last_used_at, sent_count")
    .eq("active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json(
      { error: "Verbind eerst een SMTP-account in de instellingen voordat je e-mails genereert." },
      { status: 400 }
    );
  }

  const account = accounts[0];

  try {
    // Step 1: Generate email using the sender's name/email
    const emailResult = await generateEmail(lead, account.from_name, account.from_email);

    // Step 2: Find contact email
    const contactResult = await findContactEmail(
      lead.company ?? "",
      lead.location
    );

    // Step 3: Validate email format
    const emailValid = contactResult.email && isValidEmail(contactResult.email);

    // Step 4: Save to database
    const { data, error } = await supabase
      .from("leads")
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err) {
    console.error("Email generation error:", err);
    return NextResponse.json({ error: "Email generation failed" }, { status: 500 });
  }
}
