// Inloggen op de wereld: POST {password} zet een sessiecookie; DELETE wist hem.
const { sameSecret, sessionToken, COOKIE } = require("../lib/session");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "DELETE") { res.setHeader("Set-Cookie", COOKIE("", 0)); return res.status(204).end(); }
  if (req.method !== "POST") return res.status(405).json({ error: "Alleen POST" });
  if (!process.env.HQ_PASSWORD) return res.status(500).json({ error: "HQ_PASSWORD ontbreekt in Vercel" });
  const { password } = req.body || {};
  if (!sameSecret(password, process.env.HQ_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 600)); // rem op gokken
    return res.status(401).json({ error: "Wachtwoord klopt niet" });
  }
  res.setHeader("Set-Cookie", COOKIE(sessionToken(), 60 * 60 * 24 * 30));
  return res.status(200).json({ ok: true });
};
