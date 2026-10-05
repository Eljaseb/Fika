import { getStore } from "@netlify/blobs";

const TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif"
};

export default async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const key = url.pathname.replace(/^\/api\/media\//, "");
  if (!/^[a-zA-Z0-9._-]+$/.test(key)) return new Response("Not found", { status: 404 });

  const ext = key.split(".").pop().toLowerCase();
  const type = TYPES[ext];
  if (!type) return new Response("Not found", { status: 404 });

  const store = getStore("fika-media");
  const data = await store.get(key, { type: "arrayBuffer" });
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(data, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
};

export const config = { path: "/api/media/*" };
