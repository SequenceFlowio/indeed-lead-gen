import nodemailer from "nodemailer";
import { createServiceClient } from "@/lib/supabase/server";
import { EmailAccount } from "@/lib/types";
import { DEFAULT_EMAIL_TEMPLATE, TemplateVars, renderTemplate } from "@/lib/email-template";

export interface SendResult {
  success: boolean;
  from_email?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  leadId: string,
  lead?: { user_id?: string; company?: string | null; title?: string | null; location?: string | null; salary?: string | null; url?: string | null }
): Promise<SendResult> {
  const supabase = await createServiceClient();

  // Get least-recently-used active account (round-robin)
  const { data: accounts, error } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1);

  if (error || !accounts || accounts.length === 0) {
    return { success: false, error: "Geen actief e-mailaccount gevonden. Voeg een SMTP account toe in Instellingen." };
  }

  const account: EmailAccount = accounts[0];

  // Fetch user's custom template (or fall back to default)
  let templateHtml = DEFAULT_EMAIL_TEMPLATE;
  if (lead?.user_id) {
    const { data: tmplRow } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", lead.user_id)
      .eq("key", "email_template")
      .maybeSingle();
    if (tmplRow?.value) templateHtml = tmplRow.value;
  }

  const vars: TemplateVars = {
    body,
    subject,
    company: lead?.company ?? "",
    title: lead?.title ?? "",
    location: lead?.location ?? "",
    salary: lead?.salary ?? "niet vermeld",
    url: lead?.url ?? "#",
    from_name: account.from_name ?? "",
    from_email: account.from_email ?? "",
  };

  const htmlBody = renderTemplate(templateHtml, vars);

  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: {
      user: account.smtp_user,
      pass: account.smtp_pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${account.from_name}" <${account.from_email}>`,
      to,
      subject,
      text: body,
      html: htmlBody,
    });

    await supabase
      .from("email_accounts")
      .update({
        sent_count: account.sent_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    return { success: true, from_email: account.from_email };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP fout";
    return { success: false, error: message };
  }
}
