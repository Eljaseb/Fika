import { authorized } from "../lib/admin-session.mjs";
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



export default async (req) => {
  const store = getStore({name:"fika",consistency:"strong"});

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

  if (!authorized(req)) return json({ error: "unauthorized" }, 401);

  return json({error:"Please refresh the admin page and publish each café individually."},409);
};
export const config = {path:"/api/cafes"};
