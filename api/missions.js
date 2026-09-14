// Geeft missions.json terug aan ingelogde bezoekers van de wereld (paneel Missies). Alleen lezen; schrijven doet de patrouille via git.
const { hasSession, sameSecret } = require("../lib/session");
const missions = require("../missions.json");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Alleen GET" });
  if (!hasSession(req) && !sameSecret(req.headers["x-hq-password"], process.env.HQ_PASSWORD)) return res.status(401).json({ error: "Niet ingelogd" });
  return res.status(200).json(missions);
};
