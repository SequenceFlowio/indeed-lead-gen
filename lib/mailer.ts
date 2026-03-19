import nodemailer from "nodemailer";
import { createServiceClient } from "@/lib/supabase/server";
import { EmailAccount } from "@/lib/types";

export interface SendResult {
  success: boolean;
  from_email?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  leadId: string
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

  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: {
      user: account.smtp_user,
      pass: account.smtp_pass,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${account.from_name}" <${account.from_email}>`,
      to,
      subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a; max-width: 600px;">
        <p style="white-space: pre-wrap;">${body}</p>
        <br/>
        <p style="color: #666; font-size: 12px;">
          Met vriendelijke groet,<br/>
          <strong>${account.from_name}</strong><br/>
          SequenceFlow · ${account.from_email}
        </p>
        <br/>
        <p style="color: #999; font-size: 11px;">
          Als u geen interesse heeft, kunt u simpelweg niet reageren op deze e-mail.
        </p>
      </div>`,
    });

    // Update account: sent_count++ and last_used_at
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
