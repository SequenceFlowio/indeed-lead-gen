import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { EmailAccount } from "@/lib/types";
import { DEFAULT_EMAIL_TEMPLATE, TemplateVars, renderTemplate } from "@/lib/email-template";

export async function sendNotification(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  });

  const { data: accounts } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1);

  const account: EmailAccount | undefined = accounts?.[0];
  if (!account) return;

  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: { user: account.smtp_user, pass: account.smtp_pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.sendMail({
      from: `"${getSenderName(account)}" <${account.from_email}>`,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("[sendNotification] failed:", err);
  }
}

export interface SendResult {
  success: boolean;
  from_email?: string;
  account_id?: string;
  error?: string;
}

interface SendEmailOptions {
  accountEmail?: string | null;
}

export function getSenderName(account: Pick<EmailAccount, "from_email" | "from_name">): string {
  const localPart = account.from_email.split("@")[0]?.trim();
  return localPart || account.from_name || account.from_email;
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  _leadId: string,
  lead?: { user_id?: string; company?: string | null; title?: string | null; location?: string | null; salary?: string | null; url?: string | null },
  options: SendEmailOptions = {}
): Promise<SendResult> {
  const supabase = await createServiceClient();

  let accountQuery = supabase
    .from("email_accounts")
    .select("*")
    .eq("active", true);

  if (options.accountEmail) {
    accountQuery = accountQuery.eq("from_email", options.accountEmail);
  } else {
    accountQuery = accountQuery.order("last_used_at", { ascending: true, nullsFirst: true });
  }

  const { data: accounts, error } = await accountQuery.limit(1);

  if (error || !accounts || accounts.length === 0) {
    return { success: false, error: "Geen actief e-mailaccount gevonden. Voeg een SMTP account toe in Instellingen." };
  }

  const account: EmailAccount = accounts[0];

  let template = DEFAULT_EMAIL_TEMPLATE;
  if (lead?.user_id) {
    const { data: tmplRow } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", lead.user_id)
      .eq("key", "email_template")
      .maybeSingle();
    if (tmplRow?.value) template = tmplRow.value;
  }

  const vars: TemplateVars = {
    body,
    subject,
    company: lead?.company ?? "",
    title: lead?.title ?? "",
    location: lead?.location ?? "",
    salary: lead?.salary ?? "niet vermeld",
    url: lead?.url ?? "",
    from_name: getSenderName(account),
    from_email: account.from_email,
  };

  const textBody = renderTemplate(template, vars);

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
      from: `"${getSenderName(account)}" <${account.from_email}>`,
      to,
      subject,
      text: textBody,
      replyTo: account.from_email,
    });

    await supabase
      .from("email_accounts")
      .update({
        sent_count: account.sent_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    return { success: true, from_email: account.from_email, account_id: account.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP fout";
    return { success: false, error: message };
  }
}
