// Sessie-hulpjes voor de login van de wereld (Node-functies). De middleware (Edge) rekent hetzelfde token uit met Web Crypto.
const crypto = require("crypto");

function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function sessionToken() {
  return crypto.createHmac("sha256", process.env.HQ_PASSWORD || "").update("hq-session-v1").digest("hex");
}
function hasSession(req) {
  if (!process.env.HQ_PASSWORD) return false;
  const m = (req.headers.cookie || "").match(/(?:^|;\s*)hq_session=([a-f0-9]+)/);
  return !!m && sameSecret(m[1], sessionToken());
}
const COOKIE = (value, maxAge) => `hq_session=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

module.exports = { sameSecret, sessionToken, hasSession, COOKIE };
