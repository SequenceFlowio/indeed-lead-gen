import { createClient } from "@/lib/supabase/server";
import { addLeadToInstantly } from "@/lib/instantly";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  if (!lead.contact_email) {
    return NextResponse.json({ error: "No contact email found for this lead" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const campaignId = body.campaign_id ?? process.env.INSTANTLY_DEFAULT_CAMPAIGN_ID;

  if (!campaignId) {
    return NextResponse.json({ error: "No campaign ID provided" }, { status: 400 });
  }

  const result = await addLeadToInstantly(campaignId, {
    email: lead.contact_email,
    company_name: lead.company ?? undefined,
    personalization: lead.draft_email ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update({
      status: "sent",
      email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
