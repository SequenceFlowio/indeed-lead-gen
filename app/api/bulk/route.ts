import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { ids, status, action } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  if (action === "send") {
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .in("id", ids)
      .eq("status", "email_ready")
      .not("contact_email", "is", null)
      .not("draft_email", "is", null);

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    let sent = 0;
    for (const lead of leads ?? []) {
      const result = await sendEmail(lead.contact_email, lead.draft_subject ?? "(geen onderwerp)", lead.draft_email, lead.id, lead);
      if (result.success) {
        await supabase.from("leads").update({
          status: "sent",
          email_sent_at: new Date().toISOString(),
          sent_from_email: result.from_email,
          updated_at: new Date().toISOString(),
        }).eq("id", lead.id);
        sent++;
      }
    }
    return NextResponse.json({ sent });
  }

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "rejected") {
    updates.rejected_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("leads")
    .update(updates)
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: ids.length });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  const { error } = await supabase.from("leads").delete().in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: ids.length });
}
