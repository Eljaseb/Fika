// Google Places proxy: returns rating + up to 3 review snippets.
// Needs GOOGLE_MAPS_API_KEY; without it returns {configured:false}.
export default async function handler(req, res) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const q = (req.query && req.query.q) || "";
  if (!key) return res.status(200).json({ configured: false });
  if (!q) return res.status(200).json({ configured: true, found: false });
  try {
    const find = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=place_id&key=${key}`).then((r) => r.json());
    const pid = find.candidates && find.candidates[0] && find.candidates[0].place_id;
    if (!pid) return res.status(200).json({ configured: true, found: false });
    const det = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${pid}&fields=name,rating,user_ratings_total,url,reviews&key=${key}`).then((r) => r.json());
    const r0 = det.result || {};
    const reviews = (r0.reviews || []).slice(0, 3).map((rv) => ({ author: rv.author_name, rating: rv.rating, text: (rv.text || "").slice(0, 260), time: rv.relative_time_description }));
    return res.status(200).json({ configured: true, found: true, rating: r0.rating, total: r0.user_ratings_total, url: r0.url, reviews });
  } catch (e) {
    return res.status(200).json({ configured: true, found: false, error: String(e) });
  }
}
