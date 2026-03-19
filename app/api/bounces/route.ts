import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: bounces, error } = await supabase
    .from("bounces")
    .select("*, leads(company)")
    .order("bounced_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Calculate bounce rate
  const { count: sentCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent");

  const { count: bouncedCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .in("status", ["bounced_hard", "bounced_soft"]);

  const rate = (sentCount ?? 0) > 0
    ? parseFloat((((bouncedCount ?? 0) / (sentCount ?? 1)) * 100).toFixed(1))
    : 0;

  return NextResponse.json({
    bounces: (bounces ?? []).map((b) => ({
      ...b,
      company: (b.leads as { company?: string } | null)?.company ?? null,
    })),
    bounceRate: rate,
    sentCount: sentCount ?? 0,
    bouncedCount: bouncedCount ?? 0,
  });
}
