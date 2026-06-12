/**
 * Minimaler Passwort-Schutz für eine Single-User-App.
 * Du setzt EIN Passwort als ENV-Variable APP_PASSWORD. Beim Login wird daraus
 * ein Token (SHA-256) abgeleitet und als httpOnly-Cookie gesetzt. Das rohe
 * Passwort landet nie im Cookie. Funktioniert in Edge (Middleware) und Node.
 */

export const AUTH_COOKIE = "lead_auth";

/** Leitet aus dem Passwort einen stabilen Cookie-Token ab (Web Crypto). */
export async function tokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`lead-dashboard::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** App ist nur geschützt, wenn ein Passwort gesetzt ist. */
export function passwordConfigured(): boolean {
  return !!process.env.APP_PASSWORD && process.env.APP_PASSWORD.length > 0;
}
