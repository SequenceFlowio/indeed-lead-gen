import { ImapFlow } from "imapflow";
import { EmailAccount, Lead } from "@/lib/types";

type LeadReplyFields = Pick<Lead, "contact_email" | "email_sent_at">;

function inferImapHost(smtpHost: string): string {
  if (smtpHost.startsWith("smtp.")) return smtpHost.replace(/^smtp\./, "imap.");
  return smtpHost;
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function canCheckInbox(account: EmailAccount): boolean {
  return Boolean(account.imap_host || account.smtp_host) && Boolean(account.imap_user || account.smtp_user) && Boolean(account.imap_pass || account.smtp_pass);
}

export async function hasIncomingReply(account: EmailAccount, lead: LeadReplyFields): Promise<boolean> {
  const contactEmail = normalizeEmail(lead.contact_email);
  if (!contactEmail || !lead.email_sent_at || !canCheckInbox(account)) return false;

  const client = new ImapFlow({
    host: account.imap_host || inferImapHost(account.smtp_host),
    port: account.imap_port || 993,
    secure: account.imap_secure ?? true,
    auth: {
      user: account.imap_user || account.smtp_user,
      pass: account.imap_pass || account.smtp_pass,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.mailboxOpen("INBOX", { readOnly: true });
    const sentAt = new Date(lead.email_sent_at);
    const since = new Date(sentAt.getTime() - 24 * 60 * 60 * 1000);
    const uids = await client.search({ from: contactEmail, since });

    if (!uids || uids.length === 0) return false;

    for await (const message of client.fetch(uids, { envelope: true })) {
      const from = message.envelope?.from?.map((addr) => normalizeEmail(addr.address)).filter(Boolean) ?? [];
      const date = message.envelope?.date ? new Date(message.envelope.date) : null;
      if (from.includes(contactEmail) && (!date || date >= sentAt)) return true;
    }

    return false;
  } finally {
    try {
      await client.logout();
    } catch {
      // Connection may already be closed by the provider.
    }
  }
}
