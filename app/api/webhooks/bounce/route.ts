import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const email: string = body.email ?? body.recipient ?? body.to;
  const bounceType: "hard" | "soft" = body.bounce_type ?? body.type ?? "hard";
  const reason: string | null = body.reason ?? body.error ?? body.description ?? null;

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Find lead by contact_email
  const { data: lead } = await supabase
    .from("leads")
    .select("id, company")
    .eq("contact_email", email)
    .order("email_sent_at", { ascending: false })
    .limit(1)
    .single();

  // Insert bounce record
  await supabase.from("bounces").insert({
    lead_id: lead?.id ?? null,
    email,
    bounce_type: bounceType,
    reason,
    bounced_at: new Date().toISOString(),
  });

  // Update lead status if found
  if (lead?.id) {
    const status = bounceType === "hard" ? "bounced_hard" : "bounced_soft";
    await supabase
      .from("leads")
      .update({
        status,
        bounce_type: bounceType,
        bounced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  }

  return NextResponse.json({ success: true, lead_id: lead?.id ?? null });
}
