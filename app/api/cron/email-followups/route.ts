import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hasIncomingReply } from "@/lib/inbox";
import { getSenderName, sendEmail } from "@/lib/mailer";
import { EmailAccount, Lead } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  return Boolean(
    isVercelCron ||
      (process.env.CRON_SECRET &&
        (authHeader === `Bearer ${process.env.CRON_SECRET}` || secret === process.env.CRON_SECRET))
  );
}

function buildFollowupBody(lead: Lead, account: EmailAccount, step: 1 | 2): string {
  const sender = getSenderName(account);
  const company = lead.company || "uw organisatie";

  if (step === 1) {
    return `Goedemiddag,

Ik stuur u kort een herinnering op mijn vorige mail. Is het interessant om te bekijken of SequenceFlow administratieve taken rondom ${company} kan terugbrengen?

Als dit nu geen prioriteit heeft, hoor ik het ook graag.

Met vriendelijke groet,
${sender}`;
  }

  return `Goedemiddag,

Ik wilde nog een laatste keer opvolgen op mijn eerdere bericht. Ziet u ruimte om kort te toetsen of automatisering van deze terugkerende werkzaamheden relevant is voor ${company}?

Als iemand anders hierover gaat, ontvang ik graag de juiste contactpersoon.

Met vriendelijke groet,
${sender}`;
}

function followupSubject(subject: string | null): string {
  const clean = subject?.trim() || "Automatisering";
  return clean.toLowerCase().startsWith("re:") ? clean : `Re: ${clean}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const { data: accounts, error: accountError } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("active", true);

  if (accountError) return NextResponse.json({ error: accountError.message }, { status: 500 });

  const accountsByEmail = new Map<string, EmailAccount>(
    ((accounts ?? []) as EmailAccount[]).map((account) => [account.from_email, account])
  );

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .eq("status", "sent")
    .is("reply_received_at", null)
    .is("flow_stopped_at", null)
    .not("email_sent_at", "is", null)
    .not("contact_email", "is", null)
    .order("email_sent_at", { ascending: true })
    .limit(250);

  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });

  let repliesFound = 0;
  let followup1Sent = 0;
  let followup2Sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of (leads ?? []) as Lead[]) {
    const account = lead.sent_from_email ? accountsByEmail.get(lead.sent_from_email) : undefined;
    if (!account) {
      skipped++;
      continue;
    }

    try {
      const replied = await hasIncomingReply(account, lead);
      if (replied) {
        const stoppedAt = new Date().toISOString();
        await supabase
          .from("leads")
          .update({
            reply_received_at: stoppedAt,
            flow_stopped_at: stoppedAt,
            flow_stop_reason: "reply_received",
            updated_at: stoppedAt,
          })
          .eq("id", lead.id);
        repliesFound++;
        continue;
      }
    } catch (err) {
      errors.push(`${lead.company ?? lead.id}: inbox check mislukt (${err instanceof Error ? err.message : "onbekende fout"})`);
    }

    const sentAt = new Date(lead.email_sent_at as string).getTime();
    const ageMs = now - sentAt;
    const step: 1 | 2 | null =
      !lead.followup_1_sent_at && ageMs >= 3 * dayMs
        ? 1
        : lead.followup_1_sent_at && !lead.followup_2_sent_at && ageMs >= 7 * dayMs
          ? 2
          : null;

    if (!step) continue;

    const result = await sendEmail(
      lead.contact_email as string,
      followupSubject(lead.draft_subject),
      buildFollowupBody(lead, account, step),
      lead.id,
      lead,
      { accountEmail: account.from_email }
    );

    if (!result.success) {
      errors.push(`${lead.company ?? lead.id}: follow-up ${step} mislukt (${result.error ?? "onbekende fout"})`);
      continue;
    }

    const sentIso = new Date().toISOString();
    await supabase
      .from("leads")
      .update({
        followup_sent_at: sentIso,
        ...(step === 1 ? { followup_1_sent_at: sentIso } : { followup_2_sent_at: sentIso }),
        updated_at: sentIso,
      })
      .eq("id", lead.id);

    if (step === 1) followup1Sent++;
    else followup2Sent++;
  }

  return NextResponse.json({ repliesFound, followup1Sent, followup2Sent, skipped, errors });
}
