import { promises as fs } from "fs";
import path from "path";
import { Lead } from "./types";

/**
 * Leichtgewichtiger JSON-Datastore. Bewusst keine native DB, damit das
 * Dashboard ohne Build-Tools überall läuft. Für Einzelnutzung völlig
 * ausreichend; bei Bedarf später gegen SQLite/Postgres austauschbar.
 */

// Auf Serverless-Hostern (z.B. Vercel) ist nur /tmp beschreibbar. Dort liegen
// die Daten dann temporär (gut für eine Demo). Lokal/persistent: ./data.
// Für dauerhaften Betrieb DATA_DIR auf ein beschreibbares Volume setzen oder
// den Datastore gegen eine echte DB tauschen.
const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.VERCEL ? "/tmp/lead-dashboard-data" : path.join(process.cwd(), "data"));
const DATA_FILE = path.join(DATA_DIR, "leads.json");

// Serialisiert Schreibzugriffe, damit parallele Requests die Datei nicht zerschießen.
let writeChain: Promise<unknown> = Promise.resolve();

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function readLeads(): Promise<Lead[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Lead[]) : [];
  } catch {
    return [];
  }
}

async function writeLeads(leads: Lead[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

/** Atomare Lese-Ändere-Schreibe-Operation (serialisiert). */
export function mutate<T>(fn: (leads: Lead[]) => { leads: Lead[]; result: T }): Promise<T> {
  const run = async (): Promise<T> => {
    const leads = await readLeads();
    const { leads: next, result } = fn(leads);
    await writeLeads(next);
    return result;
  };
  const p = writeChain.then(run, run);
  // Kette am Leben halten, Fehler nicht weiterreichen.
  writeChain = p.catch(() => undefined);
  return p;
}
