import { getStore } from "@netlify/blobs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function cleanText(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanRatings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 12)
      .map(([key, score]) => [cleanText(key, 60), Math.max(0, Math.min(5, Number(score) || 0))])
      .filter(([key]) => key)
  );
}

function cleanCategory(value) {
  const v = value && typeof value === "object" ? value : {};
  return {
    type: cleanText(v.type, 100),
    mod: cleanText(v.mod, 100),
    subtype: cleanText(v.subtype, 100),
    temp: cleanText(v.temp, 30),
    price: Math.max(0, Math.min(10000, Number(v.price) || 0)),
    note: cleanText(v.note, 600),
    ratings: cleanRatings(v.ratings)
  };
}

function cleanImage(value) {
  if (typeof value !== "string") return "";
  const x = value.trim();
  if (/^https:\/\//i.test(x) || /^\/api\/media\/[a-zA-Z0-9._-]+$/.test(x)) return x.slice(0, 1500);
  return "";
}

function cleanCafe(value, index) {
  const v = value && typeof value === "object" ? value : {};
  const rawImgs = Array.isArray(v.imgs) ? v.imgs : typeof v.imgs === "string" ? [v.imgs] : [];
  const imgs = rawImgs.map(cleanImage).filter(Boolean).slice(0, 6);

  return {
    id: typeof v.id === "string" || typeof v.id === "number" ? v.id : Date.now() + index,
    name: cleanText(v.name, 120) || "Untitled café",
    city: cleanText(v.city, 80),
    country: cleanText(v.country, 80),
    visitedOn: /^\d{4}-\d{2}-\d{2}$/.test(String(v.visitedOn || "")) ? String(v.visitedOn) : "",
    handle: cleanText(v.handle, 100),
    scene: cleanText(v.scene, 120),
    imgs: imgs.length ? imgs : [],
    drink: cleanCategory(v.drink),
    pastry: cleanCategory(v.pastry),
    atmosphere: Math.max(0, Math.min(5, Number(v.atmosphere) || 0)),
    service: Math.max(0, Math.min(5, Number(v.service) || 0)),
    value: Math.max(0, Math.min(5, Number(v.value) || 0)),
    bestFor: Array.isArray(v.bestFor) ? v.bestFor.map((x) => cleanText(x, 80)).filter(Boolean).slice(0, 12) : [],
    reason: cleanText(v.reason, 700),
    take: cleanText(v.take, 700)
  };
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export default async (req) => {
  const store = getStore("fika");

  if (req.method === "GET") {
    try {
      const cafes = await store.get("cafes", { type: "json" });
      return json(Array.isArray(cafes) ? cafes : []);
    } catch {
      return json([]);
    }
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const adminCode = Netlify.env.get("ADMIN_CODE");
  if (!adminCode) return json({ error: "admin_not_configured" }, 503);

  const suppliedCode = req.headers.get("x-admin-code") || "";
  if (!timingSafeEqual(suppliedCode, adminCode)) return json({ error: "unauthorized" }, 401);

  const length = Number(req.headers.get("content-length") || 0);
  if (length > 800000) return json({ error: "payload_too_large" }, 413);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!Array.isArray(body?.cafes)) return json({ error: "bad_payload" }, 400);
  if (body.cafes.length > 500) return json({ error: "too_many_cafes" }, 400);

  const cafes = body.cafes.map(cleanCafe);
  await store.setJSON("cafes", cafes);
  return json({ ok: true, count: cafes.length });
};

export const config = { path: "/api/cafes" };
