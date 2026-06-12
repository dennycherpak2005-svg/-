"use client";

import { useState } from "react";
import { Lead, LeadSource, SOURCE_LABELS } from "@/lib/types";

const SOURCES: LeadSource[] = ["google_maps", "instagram", "linkedin", "manual"];

interface Props {
  initial?: Lead | null;
  onClose: () => void;
  onSaved: () => void;
}

const FIELDS: { key: keyof Lead; label: string; placeholder?: string }[] = [
  { key: "name", label: "Name *", placeholder: "Firmen- oder Personenname" },
  { key: "company", label: "Firma" },
  { key: "industry", label: "Branche", placeholder: "z.B. Restaurant, Zahnarzt" },
  { key: "website", label: "Website", placeholder: "example.com" },
  { key: "email", label: "E-Mail" },
  { key: "phone", label: "Telefon" },
  { key: "city", label: "Stadt" },
  { key: "country", label: "Land", placeholder: "DE" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
];

export default function LeadFormModal({ initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    for (const { key } of FIELDS) f[key] = (initial?.[key] as string) ?? "";
    f.source = initial?.source ?? "manual";
    f.notes = initial?.notes ?? "";
    return f;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!form.name.trim()) {
      setError("Name ist erforderlich");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = initial
        ? await fetch(`/api/leads/${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          })
        : await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
      if (!res.ok) throw new Error((await res.json()).error || "Fehler beim Speichern");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{initial ? "Lead bearbeiten" : "Neuen Lead anlegen"}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Quelle</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          {FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} className="text-sm">
              <span className="mb-1 block text-slate-500">{label}</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form[key] ?? ""}
                placeholder={placeholder}
                onChange={(e) => set(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-slate-500">Notizen</span>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            onClick={onClose}
            disabled={saving}
          >
            Abbrechen
          </button>
          <button
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
