// Vercel Edge Middleware: de hele wereld zit achter de login. Zonder geldige sessiecookie ga je naar /login.html.
export const config = { matcher: ["/((?!api/|login\\.html|favicon\\.ico).*)"] };

async function sessionToken(secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("hq-session-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function middleware(req) {
  const secret = process.env.HQ_PASSWORD;
  if (!secret) return new Response("HQ_PASSWORD ontbreekt in Vercel", { status: 500 });
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)hq_session=([a-f0-9]+)/);
  if (m && m[1] === (await sessionToken(secret))) return; // ingelogd: doorgaan
  const url = new URL(req.url);
  return Response.redirect(new URL(`/login.html?next=${encodeURIComponent(url.pathname + url.search)}`, req.url), 302);
}
