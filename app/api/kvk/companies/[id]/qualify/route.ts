import { createClient } from "@/lib/supabase/server";
import { qualifyKVKCompany, enrichKVKCompany, isValidEmail } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company, error } = await supabase.from("kvk_companies").select("*").eq("id", id).single();
  if (error || !company) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const enrichment = await enrichKVKCompany(company.name ?? "", company.city);
  const result = await qualifyKVKCompany(company, enrichment.services_description);

  const { data: updated } = await supabase
    .from("kvk_companies")
    .update({
      ai_score: result.score,
      ai_tier: result.tier,
      ai_reasoning: result.reasoning,
      ai_key_selling_point: result.key_selling_point,
      ai_monthly_cost_est: result.estimated_monthly_cost,
      ai_company_size: result.company_size_estimate,
      ai_best_flow: result.best_flow,
      ai_best_pitch: result.best_pitch,
      website: enrichment.website,
      contact_email: isValidEmail(enrichment.contact_email ?? "") ? enrichment.contact_email : null,
      email_confidence: enrichment.email_confidence,
      status: "qualified",
      qualified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json(updated);
}
