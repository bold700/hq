// Geeft registry.json terug aan ingelogde bezoekers van de wereld, zodat de repo zelf privé kan zijn.
const { hasSession, sameSecret } = require("../lib/session");
const registry = require("../registry.json");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!hasSession(req) && !sameSecret(req.headers["x-hq-password"], process.env.HQ_PASSWORD)) return res.status(401).json({ error: "Niet ingelogd" });
  return res.status(200).json(registry);
};
