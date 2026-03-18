"use client";

import { useState } from "react";
import { Edit3, Save, Send, Loader2, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EmailPreviewProps {
  lead: Lead;
  onUpdate: (updated: Partial<Lead>) => void;
}

export default function EmailPreview({ lead, onUpdate }: EmailPreviewProps) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(lead.draft_subject ?? "");
  const [body, setBody] = useState(lead.draft_email ?? "");
  const [contactEmail, setContactEmail] = useState(lead.contact_email ?? "");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/email`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setSubject(updated.draft_subject ?? "");
      setBody(updated.draft_email ?? "");
      setContactEmail(updated.contact_email ?? "");
      onUpdate(updated);
      showToast("success", "E-mail gegenereerd");
    } catch {
      showToast("error", "Genereren mislukt");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_subject: subject,
          draft_email: body,
          contact_email: contactEmail,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onUpdate(updated);
      setEditing(false);
      showToast("success", "Opgeslagen");
    } catch {
      showToast("error", "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!contactEmail) {
      showToast("error", "Geen e-mailadres opgegeven");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onUpdate(updated);
      showToast("success", "Verstuurd via Instantly");
    } catch {
      showToast("error", "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  const confidenceColor = {
    high: "text-[#C7F56F]",
    medium: "text-amber-500",
    low: "text-red-400",
    none: "text-gray-400",
  }[lead.email_confidence ?? "none"] ?? "text-gray-400";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            E-mail concept
          </span>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Edit3 size={12} />
              Bewerken
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-2.5 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Opslaan
            </button>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Toast */}
        {toast && (
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
            toast.type === "success"
              ? "bg-[#C7F56F]/10 text-gray-700 dark:text-gray-300"
              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          )}>
            {toast.type === "success" ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {toast.message}
          </div>
        )}

        {/* To: field */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Aan
            {lead.email_confidence && lead.email_confidence !== "none" && (
              <span className={cn("ml-2 text-xs", confidenceColor)}>
                • {lead.email_confidence === "high" ? "Hoog vertrouwen" : lead.email_confidence === "medium" ? "Gemiddeld vertrouwen" : "Laag vertrouwen"}
              </span>
            )}
          </label>
          {editing ? (
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30"
            />
          ) : (
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {contactEmail || <span className="text-gray-400 italic">Geen e-mailadres</span>}
            </p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Onderwerp
          </label>
          {editing ? (
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Onderwerpregel"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30"
            />
          ) : (
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {subject || <span className="text-gray-400 italic font-normal">Geen onderwerp</span>}
            </p>
          )}
        </div>

        {/* Body */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            E-mailbody
          </label>
          {editing ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30 resize-none font-mono leading-relaxed"
            />
          ) : body ? (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {body}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Nog geen e-mail gegenereerd.
              </p>
            </div>
          )}
        </div>

        {/* Signature */}
        {body && !editing && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Met vriendelijke groet,<br />
              <strong className="text-gray-600 dark:text-gray-300">Noah</strong><br />
              SequenceFlow · noah@getsequenceflow.nl
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={generating || sending}
            className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-4 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Mail size={14} />
            )}
            {body ? "Opnieuw genereren" : "Genereer e-mail"}
          </button>

          {body && (
            <button
              onClick={handleSend}
              disabled={sending || generating || lead.status === "sent"}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {lead.status === "sent" ? "Verstuurd" : "Stuur via Instantly"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
