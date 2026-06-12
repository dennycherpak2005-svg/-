"use client";

import { useEffect, useState } from "react";

/** Erklärt, wie n8n/Flowise Leads ins Dashboard pushen. */
export default function IngestPanel({ onClose }: { onClose: () => void }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const url = `${origin}/api/ingest`;
  const example = `// n8n: HTTP Request Node → Method POST → URL ${url || "<dein-host>/api/ingest"}
// Body (JSON), ein Lead oder ein Array von Leads:
[
  {
    "name": "Trattoria Bella Napoli",
    "source": "google_maps",        // google_maps | instagram | linkedin
    "industry": "Restaurant",
    "city": "München",
    "website": "bella-napoli.de",
    "email": "info@bella-napoli.de",
    "phone": "+49 89 1234567"
  }
]`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-lg font-semibold">🔌 Leads aus n8n / Flowise einspeisen</h2>
        <p className="mb-4 text-sm text-slate-600">
          Dein n8n-Workflow scraped Google Maps, Instagram & LinkedIn und schickt die
          Leads per <strong>HTTP POST</strong> an diesen Webhook. Das Dashboard dedupliziert,
          qualifiziert (Chatbot/Erreichbarkeit) und scored sie automatisch.
        </p>

        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Webhook-URL</div>
        <code className="mb-4 block break-all rounded-lg bg-slate-900 px-3 py-2 text-sm text-emerald-300">
          POST {url || "…"}
        </code>

        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Beispiel-Body</div>
        <pre className="thin-scroll max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-200">
          {example}
        </pre>

        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          🔒 Optional absichern: setze die ENV-Variable <code>INGEST_TOKEN</code> und sende sie
          als Header <code>x-ingest-token</code> mit. Hinweis zum Scraping: LinkedIn/Instagram
          haben Nutzungsbedingungen – nutze offizielle APIs bzw. zulässige Quellen.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            onClick={onClose}
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
