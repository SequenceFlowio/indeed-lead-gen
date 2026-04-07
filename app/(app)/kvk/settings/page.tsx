"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { KVKSearchQuery } from "@/lib/types";

const DEFAULT_SBI_CODES = ["47910", "47919", "49410", "52101", "52109", "52291", "52299", "82920"];


const PROVINCE_OPTIONS = [
  "all", "Noord-Holland", "Zuid-Holland", "Utrecht", "Noord-Brabant", "Gelderland",
  "Overijssel", "Limburg", "Groningen", "Friesland", "Drenthe", "Zeeland", "Flevoland",
];

const DEFAULT_QUERY = {
  label: "Logistiek & Ecommerce",
  sector: "all",
  sbi_codes: DEFAULT_SBI_CODES,
  company_size_min: 10,
  company_size_max: 250,
  legal_form: "BV",
  province: "all",
  max_age_years: 10,
  results_per_page: 10,
};

export default function KVKSettingsPage() {
  const [queries, setQueries] = useState<KVKSearchQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newQuery, setNewQuery] = useState({ ...DEFAULT_QUERY, sbi_codes_raw: DEFAULT_SBI_CODES.join(", ") });

  const [schedule, setSchedule] = useState("off");
  const [nextScrapeAt, setNextScrapeAt] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [autoMode, setAutoMode] = useState("off");
  const [savingAutoMode, setSavingAutoMode] = useState(false);

  const [minScore, setMinScore] = useState("6");
  const [savingSettings, setSavingSettings] = useState(false);

  const [banner, setBanner] = useState<{ type: "error" | "success"; message: string } | null>(null);
  function showError(msg: string) { setBanner({ type: "error", message: msg }); }
  function showSuccess(msg: string) { setBanner({ type: "success", message: msg }); setTimeout(() => setBanner(null), 3000); }

  useEffect(() => {
    loadQueries();
    loadSchedule();
    loadAutoMode();
    loadMinScore();
  }, []);

  async function loadQueries() {
    const res = await fetch("/api/kvk/search-queries");
    if (res.ok) setQueries(await res.json());
    setLoadingQueries(false);
  }

  async function loadSchedule() {
    const res = await fetch("/api/kvk/settings/schedule");
    if (res.ok) {
      const data = await res.json();
      setSchedule(data.schedule ?? "off");
      setNextScrapeAt(data.next_scrape_at ?? null);
    }
  }

  async function loadAutoMode() {
    const res = await fetch("/api/settings/kvk-auto-mode");
    if (res.ok) {
      const data = await res.json();
      setAutoMode(data.value ?? "off");
    }
  }

  async function loadMinScore() {
    const res = await fetch("/api/settings/kvk-min-score");
    if (res.ok) {
      const data = await res.json();
      setMinScore(data.value ?? "6");
    }
  }

  async function saveSchedule(value: string) {
    setSavingSchedule(true);
    setSchedule(value);
    const res = await fetch("/api/kvk/settings/schedule", {
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

  async function saveAutoMode(value: string) {
    setSavingAutoMode(true);
    setAutoMode(value);
    await fetch("/api/settings/kvk-auto-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setSavingAutoMode(false);
  }

  async function saveMinScore() {
    setSavingSettings(true);
    await fetch("/api/settings/kvk-min-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: minScore }),
    });
    showSuccess("Instellingen opgeslagen");
    setSavingSettings(false);
  }

  async function toggleQuery(id: string, active: boolean) {
    await fetch(`/api/kvk/search-queries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setQueries((prev) => prev.map((q) => q.id === id ? { ...q, active } : q));
  }

  async function deleteQuery(id: string) {
    const res = await fetch(`/api/kvk/search-queries/${id}`, { method: "DELETE" });
    if (res.ok) setQueries((prev) => prev.filter((q) => q.id !== id));
    else showError("Verwijderen mislukt");
  }

  async function addQuery() {
    if (!newQuery.label.trim()) return;
    setAdding(true);
    const sbiCodes = newQuery.sbi_codes_raw.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/kvk/search-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newQuery.label,
        sector: newQuery.sector,
        sbi_codes: sbiCodes,
        company_size_min: newQuery.company_size_min,
        company_size_max: newQuery.company_size_max,
        legal_form: newQuery.legal_form,
        province: newQuery.province,
        max_age_years: newQuery.max_age_years,
        results_per_page: newQuery.results_per_page,
        active: true,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setQueries((prev) => [...prev, data]);
      setShowAddForm(false);
      setNewQuery({ ...DEFAULT_QUERY, sbi_codes_raw: DEFAULT_SBI_CODES.join(", ") });
      showSuccess("Zoekopdracht toegevoegd");
    } else {
      showError("Toevoegen mislukt");
    }
    setAdding(false);
  }

  async function seedDefault() {
    const res = await fetch("/api/kvk/search-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...DEFAULT_QUERY, active: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setQueries((prev) => [...prev, data]);
      showSuccess("Standaard zoekopdracht toegevoegd");
    }
  }

  function formatNextScrape(iso: string): string {
    const next = new Date(iso);
    return next.toLocaleDateString("nl-NL", { weekday: "long", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col gap-8">
      {banner && (
        <div
          onClick={() => setBanner(null)}
          className={`cursor-pointer rounded-xl border px-4 py-3 text-sm ${
            banner.type === "error"
              ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              : "border-[#C7F56F]/40 bg-[#C7F56F]/10 text-[#3a6600] dark:text-[#C7F56F]"
          }`}
        >
          {banner.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Instellingen — KVK</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Beheer KVK zoekopdrachten en automatisering</p>
      </div>

      {/* Scheduler */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Automatisch scrapen</h2>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "off", label: "Uit" },
            { value: "12", label: "Elke 12u" },
            { value: "24", label: "Elke 24u" },
            { value: "36", label: "Elke 36u" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => saveSchedule(opt.value)}
              disabled={savingSchedule}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                schedule === opt.value
                  ? "bg-[#C7F56F] text-[#1a1a1a]"
                  : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {savingSchedule && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>
        {nextScrapeAt && schedule !== "off" && (
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Volgende scrape: {formatNextScrape(nextScrapeAt)}</p>
        )}
      </section>

      {/* Automatisering */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Automatisering</h2>
        <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">Wat moet er automatisch gebeuren na elke KVK scrape?</p>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "off", label: "Handmatig", desc: "Niets automatisch" },
            { value: "draft", label: "Auto-kwalificeren + concept", desc: "Kwalificeer + maak e-mail concept" },
            { value: "send", label: "Auto-kwalificeren + verzenden", desc: "Kwalificeer + genereer + stuur direct" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => saveAutoMode(opt.value)}
              disabled={savingAutoMode}
              title={opt.desc}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                autoMode === opt.value
                  ? "bg-[#C7F56F] text-[#1a1a1a]"
                  : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              } disabled:opacity-50`}
            >
              {opt.label}
            </button>
          ))}
          {savingAutoMode && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>
      </section>

      {/* KVK Search queries */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">KVK Zoekopdrachten</h2>
          <div className="flex gap-2">
            {queries.length === 0 && (
              <button
                onClick={seedDefault}
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
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Label <span className="text-red-400">*</span></label>
                <input
                  value={newQuery.label}
                  onChange={(e) => setNewQuery({ ...newQuery, label: e.target.value })}
                  placeholder="bijv. Logistiek BV"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">SBI codes (kommagescheiden)</label>
                <input
                  value={newQuery.sbi_codes_raw}
                  onChange={(e) => setNewQuery({ ...newQuery, sbi_codes_raw: e.target.value })}
                  placeholder="47910, 49410, 52101"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Rechtsvorm</label>
                <select
                  value={newQuery.legal_form}
                  onChange={(e) => setNewQuery({ ...newQuery, legal_form: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F]"
                >
                  <option value="all">Alle</option>
                  <option value="BV">BV</option>
                  <option value="NV">NV</option>
                  <option value="Eenmanszaak">Eenmanszaak</option>
                  <option value="VOF">VOF</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Provincie</label>
                <select
                  value={newQuery.province}
                  onChange={(e) => setNewQuery({ ...newQuery, province: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F]"
                >
                  {PROVINCE_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p === "all" ? "Alle provincies" : p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Max. leeftijd bedrijf (jaren)</label>
                <input
                  type="number"
                  value={newQuery.max_age_years}
                  onChange={(e) => setNewQuery({ ...newQuery, max_age_years: parseInt(e.target.value) || 10 })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">Resultaten per SBI code</label>
                <input
                  type="number"
                  value={newQuery.results_per_page}
                  min="1"
                  max="100"
                  onChange={(e) => setNewQuery({ ...newQuery, results_per_page: parseInt(e.target.value) || 10 })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addQuery}
                disabled={adding || !newQuery.label.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-4 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
              >
                {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Opslaan
              </button>
              <button onClick={() => setShowAddForm(false)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Annuleren
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {loadingQueries ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
          ) : queries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">Geen zoekopdrachten. Klik op &ldquo;Standaard laden&rdquo; om te starten.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">SBI codes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Provincie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Max leeftijd</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Actief</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {queries.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">{q.label}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{q.sbi_codes?.slice(0, 3).join(", ")}{(q.sbi_codes?.length ?? 0) > 3 ? ` +${(q.sbi_codes?.length ?? 0) - 3}` : ""}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{q.province === "all" ? "Alle" : q.province}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{q.max_age_years} jaar</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleQuery(q.id, !q.active)} className="text-gray-400 hover:text-[#C7F56F] transition-colors">
                        {q.active ? <ToggleRight size={20} className="text-[#C7F56F]" /> : <ToggleLeft size={20} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteQuery(q.id)} className="rounded-lg bg-red-50 dark:bg-red-900/20 px-2 py-1 text-xs text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
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
          Per SBI code worden {"{results_per_page}"} resultaten opgehaald uit de KVK API.
        </p>
      </section>

      {/* AI Settings */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 max-w-lg">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">AI Instellingen</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Minimum AI-score voor kwalificatie</label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            min="1"
            max="10"
            className="w-32 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Bedrijven met een lagere score worden afgewezen</p>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveMinScore}
            disabled={savingSettings}
            className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-5 py-2.5 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
          >
            {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Opslaan
          </button>
        </div>
      </section>
    </div>
  );
}
