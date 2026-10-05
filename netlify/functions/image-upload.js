import { getStore } from "@netlify/blobs";

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif"
};

export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });

  const expected = Netlify.env.get("ADMIN_CODE");
  const supplied = req.headers.get("x-admin-code") || "";
  if (!expected || !timingSafeEqual(supplied, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let form;
  try { form = await req.formData(); }
  catch { return Response.json({ error: "invalid_form" }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "missing_file" }, { status: 400 });
  if (!TYPES[file.type]) return Response.json({ error: "unsupported_type" }, { status: 415 });
  if (file.size > 12 * 1024 * 1024) return Response.json({ error: "file_too_large" }, { status: 413 });

  const id = crypto.randomUUID();
  const key = id + "." + TYPES[file.type];
  const store = getStore("fika-media");
  await store.set(key, await file.arrayBuffer());

  return Response.json({ ok: true, url: "/api/media/" + key });
};

export const config = { path: "/api/images/upload" };
