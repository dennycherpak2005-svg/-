"use client";

import { Lead, SOURCE_LABELS, STATUS_LABELS, tierOf } from "@/lib/types";

export function ScoreBadge({ score }: { score: number }) {
  const tier = tierOf(score);
  const styles: Record<string, string> = {
    hot: "bg-red-100 text-red-700 ring-red-200",
    warm: "bg-amber-100 text-amber-700 ring-amber-200",
    cold: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  const label = { hot: "🔥 Heiß", warm: "🌤 Warm", cold: "❄️ Kalt" }[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[tier]}`}
      title={`Score ${score}/100`}
    >
      {score} · {label}
    </span>
  );
}

export function SourceBadge({ source }: { source: Lead["source"] }) {
  const styles: Record<string, string> = {
    google_maps: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    instagram: "bg-pink-50 text-pink-700 ring-pink-200",
    linkedin: "bg-sky-50 text-sky-700 ring-sky-200",
    manual: "bg-slate-50 text-slate-600 ring-slate-200",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[source]}`}>
      {SOURCE_LABELS[source]}
    </span>
  );
}

export function ChatbotBadge({ lead }: { lead: Lead }) {
  if (lead.hasChatbot === null) {
    return <span className="text-xs text-slate-400">– ungeprüft</span>;
  }
  if (lead.hasChatbot) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">
        🤖 hat Bot{lead.chatbotVendor ? ` (${lead.chatbotVendor})` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700 ring-1 ring-inset ring-green-200">
      ✅ kein Bot
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-200",
  contacted: "bg-violet-50 text-violet-700 ring-violet-200",
  replied: "bg-amber-50 text-amber-700 ring-amber-200",
  won: "bg-green-50 text-green-700 ring-green-200",
  lost: "bg-slate-50 text-slate-400 ring-slate-200",
};

export function StatusBadge({ status }: { status: Lead["status"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
