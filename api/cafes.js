// Shared café store on Vercel Blob (version-proof: unique file per publish + cleanup).
// GET  -> returns the most recently published cafés (everyone)
// POST -> { code, cafes } saves them (only if code === ADMIN_CODE)
import { put, list, del } from "@vercel/blob";

const PREFIX = "cafes-";
const token = process.env.BLOB_READ_WRITE_TOKEN; // auto-injected when a Blob store is connected

async function newestFirst() {
  const { blobs } = await list({ prefix: PREFIX, token });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const blobs = await newestFirst();
      if (!blobs.length) return res.status(200).json([]);
      const r = await fetch(blobs[0].url, { cache: "no-store" });
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data : []);
    } catch (e) {
      return res.status(200).json([]); // empty -> app falls back to seed cafes.json
    }
  }

  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!process.env.ADMIN_CODE || !body || body.code !== process.env.ADMIN_CODE) return res.status(401).json({ error: "unauthorized" });
    if (!Array.isArray(body.cafes)) return res.status(400).json({ error: "bad_payload" });
    if (!token) return res.status(500).json({ error: "no_blob_token" });
    try {
      const { url } = await put(PREFIX + Date.now() + ".json", JSON.stringify(body.cafes), {
        access: "public",
        token,
        contentType: "application/json",
      });
      // keep only the version we just wrote
      try {
        const { blobs } = await list({ prefix: PREFIX, token });
        const old = blobs.filter((b) => b.url !== url).map((b) => b.url);
        if (old.length) await del(old, { token });
      } catch {}
      return res.status(200).json({ ok: true, count: body.cafes.length, url });
    } catch (e) {
      return res.status(500).json({ error: "write_failed", detail: String(e) });
    }
  }

  return res.status(405).json({ error: "method_not_allowed" });
}
