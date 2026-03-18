import { createClient } from "@/lib/supabase/server";
import { qualifyLead } from "@/lib/openai";
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

  try {
    const result = await qualifyLead(lead);

    const { data, error } = await supabase
      .from("leads")
      .update({
        ai_score: result.score,
        ai_tier: result.tier,
        ai_best_flow: result.best_flow,
        ai_best_pitch: result.best_pitch,
        ai_reasoning: result.reasoning,
        ai_key_selling_point: result.key_selling_point,
        ai_monthly_cost_est: result.estimated_monthly_cost,
        ai_company_size: result.company_size_estimate,
        qualified_at: new Date().toISOString(),
        status: result.score >= 7 ? "qualified" : lead.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err) {
    console.error("Qualification error:", err);
    return NextResponse.json({ error: "AI qualification failed" }, { status: 500 });
  }
}
