"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onDone: () => void;
}

const PRESETS = ["Zahnarzt", "Restaurant", "Friseur", "Fitnessstudio", "Immobilienmakler", "Kosmetikstudio", "Café", "Autohaus"];

export default function ScrapePanel({ onClose, onDone }: Props) {
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!industry.trim() && !city.trim()) {
      setError("Bitte Branche und/oder Stadt angeben");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, city }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Suche fehlgeschlagen");
      setResult(
        `${data.found} gefunden · ${data.added} neu hinzugefügt · ${data.skipped} Dubletten übersprungen` +
          (data.demo ? "  ⚠️ Demo-Modus (kein API-Key)" : "")
      );
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-semibold">🔍 Leads finden (Google Maps)</h2>
        <p className="mb-4 text-sm text-slate-600">
          Branche + Stadt eingeben → das Dashboard holt lokale Unternehmen und bewertet sie automatisch.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Branche</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="z.B. Zahnarzt"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Stadt</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="z.B. München"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setIndustry(p)}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              {p}
            </button>
          ))}
        </div>

        {result && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{result}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100" onClick={onClose}>
            Schließen
          </button>
          <button
            onClick={search}
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "Suche läuft…" : "🔍 Suchen"}
          </button>
        </div>
      </div>
    </div>
  );
}
