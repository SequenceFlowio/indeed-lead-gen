"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, ToggleLeft, ToggleRight, Eye, EyeOff } from "lucide-react";
import { SearchQuery, EmailAccount } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_QUERIES = [
  { query: "logistiek medewerker", label: "Logistiek", flow: "Operations Flow", pitch: "Automatiseer handmatige logistieke taken", angle: "operations" },
  { query: "warehouse medewerker", label: "Warehouse", flow: "Operations Flow", pitch: "Bespaar uren op warehouse administratie", angle: "operations" },
  { query: "supply chain medewerker", label: "Supply Chain", flow: "Lead Flow", pitch: "Optimaliseer uw supply chain processen", angle: "operations" },
  { query: "transport planner", label: "Transport", flow: "Operations Flow", pitch: "Automatiseer transport planning en communicatie", angle: "operations" },
  { query: "inkoop medewerker", label: "Inkoop", flow: "Lead Flow", pitch: "Stroomlijn inkoopprocessen met automatisering", angle: "operations" },
  { query: "expediteur", label: "Expeditie", flow: "Operations Flow", pitch: "Versnel documentverwerking en tracking", angle: "operations" },
  { query: "logistics coordinator", label: "Logistics Coord.", flow: "Operations Flow", pitch: "Coördineer logistiek efficiënter met automatisering", angle: "operations" },
  { query: "ecommerce medewerker", label: "Ecommerce", flow: "Lead Flow", pitch: "Schaal uw ecommerce operaties zonder extra personeel", angle: "ecommerce" },
  { query: "webshop medewerker", label: "Webshop", flow: "Lead Flow", pitch: "Automatiseer webshop orders en klantenservice", angle: "ecommerce" },
  { query: "marketplace medewerker", label: "Marketplace", flow: "Lead Flow", pitch: "Beheer meerdere marketplaces automatisch", angle: "ecommerce" },
  { query: "online marketing medewerker", label: "Online Marketing", flow: "Support Flow", pitch: "Automatiseer rapportages en campagnes", angle: "ecommerce" },
  { query: "fulfillment medewerker", label: "Fulfillment", flow: "Operations Flow", pitch: "Automatiseer fulfillment en orderbeheer", angle: "operations" },
  { query: "customer service ecommerce", label: "Customer Service", flow: "Support Flow", pitch: "Verwerk klantvragen sneller met AI", angle: "support" },
  { query: "voorraadbeheer medewerker", label: "Voorraadbeheer", flow: "Operations Flow", pitch: "Houd voorraad automatisch bij met real-time data", angle: "operations" },
];

const SCHEDULE_OPTIONS = [
  { value: "off", label: "Uit" },
  { value: "12", label: "Elke 12u" },
  { value: "24", label: "Elke 24u" },
  { value: "36", label: "Elke 36u" },
];

export default function SettingsPage() {
  const [queries, setQueries] = useState<SearchQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [savingQuery, setSavingQuery] = useState<string | null>(null);
  const [newQuery, setNewQuery] = useState({ query: "", label: "", flow: "Operations Flow", location: "Netherlands" });
  const [addingQuery, setAddingQuery] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Settings state
  const [minScore, setMinScore] = useState("7");
  const [savingSettings, setSavingSettings] = useState(false);

  // Scheduler state
  const [schedule, setSchedule] = useState("off");
  const [nextScrapeAt, setNextScrapeAt] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Email accounts state
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "", from_name: "", from_email: "", smtp_host: "", smtp_port: "587", smtp_user: "", smtp_pass: "",
  });

  useEffect(() => {
    loadQueries();
    loadSettings();
    loadSchedule();
    loadEmailAccounts();
  }, []);

  async function loadQueries() {
    const { data } = await createClient().from("search_queries").select("*").order("created_at");
    setQueries(data ?? []);
    setLoadingQueries(false);
  }

  async function loadSettings() {
    const { data } = await createClient().from("settings").select("*");
    if (data) {
      const kvMap = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
      setMinScore(kvMap["min_score_threshold"] ?? "7");
    }
  }

  async function loadSchedule() {
    const res = await fetch("/api/settings/schedule");
    if (res.ok) {
      const data = await res.json();
      setSchedule(data.schedule ?? "off");
      setNextScrapeAt(data.next_scrape_at ?? null);
    }
  }

  async function loadEmailAccounts() {
    const res = await fetch("/api/email-accounts");
    if (res.ok) {
      const data = await res.json();
      setEmailAccounts(data);
    }
    setLoadingAccounts(false);
  }

  async function toggleQuery(id: string, active: boolean) {
    setSavingQuery(id);
    await createClient().from("search_queries").update({ active }).eq("id", id);
    setQueries((prev) => prev.map((q) => q.id === id ? { ...q, active } : q));
    setSavingQuery(null);
  }

  async function deleteQuery(id: string) {
    await createClient().from("search_queries").delete().eq("id", id);
    setQueries((prev) => prev.filter((q) => q.id !== id));
  }

  async function addQuery() {
    if (!newQuery.query.trim()) return;
    setAddingQuery(true);
    const { data } = await createClient().from("search_queries").insert({
      ...newQuery,
      active: true,
    }).select().single();
    if (data) setQueries((prev) => [...prev, data]);
    setNewQuery({ query: "", label: "", flow: "Operations Flow", location: "Netherlands" });
    setShowAddForm(false);
    setAddingQuery(false);
  }

  async function seedDefaultQueries() {
    const { data } = await createClient()
      .from("search_queries")
      .insert(DEFAULT_QUERIES.map((q) => ({ ...q, location: "Netherlands", active: true })))
      .select();
    if (data) setQueries((prev) => [...prev, ...data]);
  }

  async function saveSettings() {
    setSavingSettings(true);
    const upserts = [
      { key: "min_score_threshold", value: minScore, updated_at: new Date().toISOString() },
    ];
    await createClient().from("settings").upsert(upserts);
    setSavingSettings(false);
  }

  async function saveSchedule(value: string) {
    setSavingSchedule(true);
    setSchedule(value);
    const res = await fetch("/api/settings/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: value }),
    });
    if (res.ok) {
      const data = await res.json();
      setNextScrapeAt(data.next_scrape_at ?? null);
    }
    setSavingSchedule(false);
  }

  async function toggleAccount(id: string, active: boolean) {
    await fetch(`/api/email-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setEmailAccounts((prev) => prev.map((a) => a.id === id ? { ...a, active } : a));
  }

  async function deleteAccount(id: string) {
    await fetch(`/api/email-accounts/${id}`, { method: "DELETE" });
    setEmailAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  async function addAccount() {
    if (!newAccount.name || !newAccount.from_email || !newAccount.smtp_host || !newAccount.smtp_user || !newAccount.smtp_pass) return;
    setAddingAccount(true);
    const res = await fetch("/api/email-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAccount, smtp_port: parseInt(newAccount.smtp_port) || 587 }),
    });
    if (res.ok) {
      const data = await res.json();
      setEmailAccounts((prev) => [...prev, data]);
      setNewAccount({ name: "", from_name: "", from_email: "", smtp_host: "", smtp_port: "587", smtp_user: "", smtp_pass: "" });
      setShowAddAccountForm(false);
    }
    setAddingAccount(false);
  }

  function formatNextScrape(iso: string): string {
    const next = new Date(iso);
    const options: Intl.DateTimeFormatOptions = { weekday: "long", hour: "2-digit", minute: "2-digit" };
    return next.toLocaleDateString("nl-NL", options);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Instellingen
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Beheer zoekopdrachten, SMTP-accounts en AI-instellingen
        </p>
      </div>

      {/* Scheduler */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Automatisch scrapen
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {SCHEDULE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => saveSchedule(opt.value)}
              disabled={savingSchedule}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                schedule === opt.value
                  ? "bg-[#C7F56F] text-[#1a1a1a]"
                  : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              } disabled:opacity-50`}
            >
              {opt.label}
            </button>
          ))}
          {savingSchedule && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>
        {nextScrapeAt && schedule !== "off" && (
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Volgende scrape: {formatNextScrape(nextScrapeAt)}
          </p>
        )}
      </section>

      {/* Email accounts */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            SMTP E-mailaccounts
          </h2>
          <button
            onClick={() => setShowAddAccountForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors"
          >
            <Plus size={12} />
            Toevoegen
          </button>
        </div>

        {showAddAccountForm && (
          <div className="mb-3 rounded-xl border border-[#C7F56F]/30 bg-[#C7F56F]/5 p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Naam <span className="text-red-400">*</span></label>
                <input value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} placeholder="noah@sequenceflow" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Weergavenaam</label>
                <input value={newAccount.from_name} onChange={(e) => setNewAccount({ ...newAccount, from_name: e.target.value })} placeholder="Noah - SequenceFlow" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Van e-mail <span className="text-red-400">*</span></label>
                <input type="email" value={newAccount.from_email} onChange={(e) => setNewAccount({ ...newAccount, from_email: e.target.value })} placeholder="noah@sequenceflow.io" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">SMTP Host <span className="text-red-400">*</span></label>
                <input value={newAccount.smtp_host} onChange={(e) => setNewAccount({ ...newAccount, smtp_host: e.target.value })} placeholder="smtp.hostinger.com" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">SMTP Poort</label>
                <input type="number" value={newAccount.smtp_port} onChange={(e) => setNewAccount({ ...newAccount, smtp_port: e.target.value })} placeholder="587" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">SMTP Gebruiker <span className="text-red-400">*</span></label>
                <input value={newAccount.smtp_user} onChange={(e) => setNewAccount({ ...newAccount, smtp_user: e.target.value })} placeholder="noah@sequenceflow.io" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">SMTP Wachtwoord <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={newAccount.smtp_pass} onChange={(e) => setNewAccount({ ...newAccount, smtp_pass: e.target.value })} placeholder="••••••••" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 pr-9 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30" />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addAccount}
                disabled={addingAccount || !newAccount.name || !newAccount.from_email || !newAccount.smtp_host || !newAccount.smtp_user || !newAccount.smtp_pass}
                className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-4 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
              >
                {addingAccount ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Opslaan
              </button>
              <button
                onClick={() => setShowAddAccountForm(false)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          ) : emailAccounts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Geen SMTP-accounts. Voeg een account toe om e-mails te kunnen versturen.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Naam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Van e-mail</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">SMTP host</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Verzonden</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Actief</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {emailAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">{acc.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{acc.from_email}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{acc.smtp_host}:{acc.smtp_port}</td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">{acc.sent_count ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleAccount(acc.id, !acc.active)} className="text-gray-400 hover:text-[#C7F56F] transition-colors">
                        {acc.active ? <ToggleRight size={20} className="text-[#C7F56F]" /> : <ToggleLeft size={20} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteAccount(acc.id)} className="rounded-lg bg-red-50 dark:bg-red-900/20 px-2 py-1 text-xs text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          E-mails worden automatisch verdeeld over actieve accounts (round-robin op basis van laatste gebruik).
        </p>
      </section>

      {/* Search queries */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Zoekopdrachten
          </h2>
          <div className="flex gap-2">
            {queries.length === 0 && (
              <button
                onClick={seedDefaultQueries}
                className="flex items-center gap-1.5 rounded-lg border border-[#C7F56F]/40 bg-[#C7F56F]/5 px-3 py-1.5 text-xs font-medium text-[#3a6600] dark:text-[#C7F56F] hover:bg-[#C7F56F]/10 transition-colors"
              >
                Standaard laden
              </button>
            )}
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors"
            >
              <Plus size={12} />
              Toevoegen
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="mb-3 rounded-xl border border-[#C7F56F]/30 bg-[#C7F56F]/5 p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                  Zoekopdracht <span className="text-red-400">*</span>
                </label>
                <input
                  value={newQuery.query}
                  onChange={(e) => setNewQuery({ ...newQuery, query: e.target.value })}
                  placeholder="bijv. logistiek medewerker"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Label</label>
                <input
                  value={newQuery.label}
                  onChange={(e) => setNewQuery({ ...newQuery, label: e.target.value })}
                  placeholder="bijv. Logistiek"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addQuery}
                disabled={addingQuery || !newQuery.query.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-4 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
              >
                {addingQuery ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Opslaan
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {loadingQueries ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          ) : queries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Geen zoekopdrachten. Klik op &ldquo;Standaard laden&rdquo; om te starten.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Zoekopdracht</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Flow</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Actief</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {queries.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{q.query}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{q.label ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{q.flow ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleQuery(q.id, !q.active)}
                        disabled={savingQuery === q.id}
                        className="text-gray-400 hover:text-[#C7F56F] transition-colors"
                      >
                        {q.active
                          ? <ToggleRight size={20} className="text-[#C7F56F]" />
                          : <ToggleLeft size={20} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteQuery(q.id)}
                        className="rounded-lg bg-red-50 dark:bg-red-900/20 px-2 py-1 text-xs text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* AI Settings */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 max-w-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          AI Instellingen
        </h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Minimum AI-score voor kwalificatie
          </label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            min="1"
            max="10"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Leads met een lagere score worden niet automatisch gekwalificeerd
          </p>
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-5 py-2.5 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
        >
          {savingSettings ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Instellingen opslaan
        </button>
      </div>
    </div>
  );
}
