// Returns Google rating + up to 3 review snippets for a café.
// Needs GOOGLE_MAPS_API_KEY (Google Cloud, Places API enabled, billing on).
// Without the key it returns {configured:false} and the app falls back to a Maps link.
export const handler = async (event) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const q = (event.queryStringParameters && event.queryStringParameters.q) || "";
  const json = (obj, status = 200) => ({ statusCode: status, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) });
  if (!key) return json({ configured: false });
  if (!q) return json({ configured: true, found: false });
  try {
    const find = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=place_id&key=${key}`).then((r) => r.json());
    const pid = find.candidates && find.candidates[0] && find.candidates[0].place_id;
    if (!pid) return json({ configured: true, found: false });
    const det = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${pid}&fields=name,rating,user_ratings_total,url,reviews&key=${key}`).then((r) => r.json());
    const res = det.result || {};
    const reviews = (res.reviews || []).slice(0, 3).map((rv) => ({ author: rv.author_name, rating: rv.rating, text: (rv.text || "").slice(0, 260), time: rv.relative_time_description }));
    return json({ configured: true, found: true, rating: res.rating, total: res.user_ratings_total, url: res.url, reviews });
  } catch (e) {
    return json({ configured: true, found: false, error: String(e) });
  }
};
