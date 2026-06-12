// Shared café store using Netlify Blobs (no external DB/account needed).
// GET  -> returns the published cafés (everyone)
// POST -> { code, cafes }  saves them (only if code matches ADMIN_CODE env)
import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  const json = (o, s = 200) => ({ statusCode: s, headers: { "content-type": "application/json" }, body: JSON.stringify(o) });
  let store;
  try { store = getStore("fika"); } catch (e) { return json({ error: "blobs_unavailable" }, 500); }

  if (event.httpMethod === "GET") {
    try { const data = await store.get("cafes", { type: "json" }); return json(Array.isArray(data) ? data : []); }
    catch { return json([]); }
  }

  if (event.httpMethod === "POST") {
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}
    if (!process.env.ADMIN_CODE || body.code !== process.env.ADMIN_CODE) return json({ error: "unauthorized" }, 401);
    if (!Array.isArray(body.cafes)) return json({ error: "bad_payload" }, 400);
    try { await store.setJSON("cafes", body.cafes); return json({ ok: true, count: body.cafes.length }); }
    catch (e) { return json({ error: "write_failed", detail: String(e) }, 500); }
  }
  return json({ error: "method_not_allowed" }, 405);
};
