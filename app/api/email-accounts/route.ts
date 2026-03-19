import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("email_accounts").select("*").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, from_name, from_email, smtp_host, smtp_port, smtp_user, smtp_pass } = body;

  if (!name || !from_email || !smtp_host || !smtp_user || !smtp_pass) {
    return NextResponse.json({ error: "Verplichte velden ontbreken" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_accounts")
    .insert({ name, from_name: from_name || name, from_email, smtp_host, smtp_port: smtp_port ?? 587, smtp_user, smtp_pass, active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
