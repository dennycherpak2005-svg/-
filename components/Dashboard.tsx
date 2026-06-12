"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lead, LeadSource, LeadStatus, SOURCE_LABELS, STATUS_LABELS, tierOf } from "@/lib/types";
import { ChatbotBadge, ScoreBadge, SourceBadge, StatusBadge } from "./badges";
import LeadFormModal from "./LeadFormModal";
import IngestPanel from "./IngestPanel";

type SourceFilter = "all" | LeadSource;
type StatusFilter = "all" | LeadStatus;
type TierFilter = "all" | "hot" | "warm" | "cold";

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [sourceF, setSourceF] = useState<SourceFilter>("all");
  const [statusF, setStatusF] = useState<StatusFilter>("all");
  const [tierF, setTierF] = useState<TierFilter>("all");
  const [noBotOnly, setNoBotOnly] = useState(false);

  const [editing, setEditing] = useState<Lead | null | undefined>(undefined);
  const [showIngest, setShowIngest] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/leads", { cache: "no-store" });
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (sourceF !== "all" && l.source !== sourceF) return false;
      if (statusF !== "all" && l.status !== statusF) return false;
      if (tierF !== "all" && tierOf(l.score) !== tierF) return false;
      if (noBotOnly && l.hasChatbot !== false) return false;
      if (needle) {
        const hay = `${l.name} ${l.company ?? ""} ${l.industry ?? ""} ${l.city ?? ""} ${l.website ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [leads, q, sourceF, statusF, tierF, noBotOnly]);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      hot: leads.filter((l) => tierOf(l.score) === "hot").length,
      noBot: leads.filter((l) => l.hasChatbot === false).length,
      contacted: leads.filter((l) => ["contacted", "replied"].includes(l.status)).length,
      won: leads.filter((l) => l.status === "won").length,
    };
  }, [leads]);

  async function seed() {
    setBusy("seed");
    await fetch("/api/seed", { method: "POST" });
    await load();
    setBusy(null);
  }

  async function setStatus(id: string, status: LeadStatus) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function enrich(id: string) {
    setBusy(`enrich-${id}`);
    await fetch(`/api/leads/${id}/enrich`, { method: "POST" });
    await load();
    setBusy(null);
  }

  async function enrichAll() {
    const targets = leads.filter((l) => l.website && l.hasChatbot === null);
    setBusy("enrich-all");
    for (const l of targets) {
      await fetch(`/api/leads/${l.id}/enrich`, { method: "POST" });
    }
    await load();
    setBusy(null);
  }

  async function remove(id: string) {
    if (!confirm("Lead wirklich löschen?")) return;
    setLeads((ls) => ls.filter((l) => l.id !== id));
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-xl text-white">🤖</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Lead Dashboard</h1>
            <p className="text-sm text-slate-500">Chatbot-Automatisierung · Leads scrapen, qualifizieren, abschließen</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowIngest(true)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🔌 n8n verbinden
          </button>
          <button
            onClick={enrichAll}
            disabled={busy === "enrich-all"}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === "enrich-all" ? "Analysiere…" : "🔎 Alle anreichern"}
          </button>
          <button
            onClick={() => setEditing(null)}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Lead
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Leads gesamt" value={stats.total} />
        <StatCard label="🔥 Heiße Leads" value={stats.hot} accent="text-red-600" />
        <StatCard label="✅ Ohne Chatbot" value={stats.noBot} accent="text-green-600" />
        <StatCard label="In Bearbeitung" value={stats.contacted} accent="text-violet-600" />
        <StatCard label="🏆 Gewonnen" value={stats.won} accent="text-emerald-600" />
      </div>

      {/* Filterleiste */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Suche (Name, Firma, Branche, Stadt)…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <Select value={sourceF} onChange={(v) => setSourceF(v as SourceFilter)} label="Quelle">
          <option value="all">Alle Quellen</option>
          {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </Select>
        <Select value={statusF} onChange={(v) => setStatusF(v as StatusFilter)} label="Status">
          <option value="all">Alle Status</option>
          {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select value={tierF} onChange={(v) => setTierF(v as TierFilter)} label="Tier">
          <option value="all">Alle Tiers</option>
          <option value="hot">🔥 Heiß</option>
          <option value="warm">🌤 Warm</option>
          <option value="cold">❄️ Kalt</option>
        </Select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <input type="checkbox" checked={noBotOnly} onChange={(e) => setNoBotOnly(e.target.checked)} />
          Nur ohne Chatbot
        </label>
      </div>

      {/* Tabelle */}
      <div className="thin-scroll overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Quelle</th>
              <th className="px-4 py-3">Standort</th>
              <th className="px-4 py-3">Chatbot</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Lade…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  {leads.length === 0 ? (
                    <div className="space-y-3">
                      <p>Noch keine Leads. Verbinde n8n oder lade Beispiel-Daten.</p>
                      <button
                        onClick={seed}
                        disabled={busy === "seed"}
                        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        {busy === "seed" ? "Lade…" : "📦 Demo-Leads laden"}
                      </button>
                    </div>
                  ) : (
                    "Keine Leads für diese Filter."
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{l.name}</div>
                    <div className="text-xs text-slate-500">
                      {l.company && <span>{l.company} · </span>}
                      {l.industry}
                    </div>
                    {l.website && (
                      <a
                        href={/^https?:\/\//.test(l.website) ? l.website : `https://${l.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand hover:underline"
                      >
                        {l.website} ↗
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3"><SourceBadge source={l.source} /></td>
                  <td className="px-4 py-3 text-slate-600">
                    {[l.city, l.country].filter(Boolean).join(", ") || "–"}
                  </td>
                  <td className="px-4 py-3"><ChatbotBadge lead={l} /></td>
                  <td className="px-4 py-3" title={l.scoreReasons.join("\n")}>
                    <ScoreBadge score={l.score} />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => setStatus(l.id, e.target.value as LeadStatus)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                    >
                      {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {l.website && (
                        <button
                          onClick={() => enrich(l.id)}
                          disabled={busy === `enrich-${l.id}`}
                          title="Website analysieren (Chatbot + Erreichbarkeit)"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        >
                          {busy === `enrich-${l.id}` ? "⏳" : "🔎"}
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(l)}
                        title="Bearbeiten"
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => remove(l.id)}
                        title="Löschen"
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        {filtered.length} von {leads.length} Leads · Score-Logik: kein Chatbot + schlechte Erreichbarkeit = heißer Lead
      </p>

      {editing !== undefined && (
        <LeadFormModal initial={editing} onClose={() => setEditing(undefined)} onSaved={load} />
      )}
      {showIngest && <IngestPanel onClose={() => setShowIngest(false)} />}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ?? "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
    >
      {children}
    </select>
  );
}
