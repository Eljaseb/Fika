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
    shots: ["1","2","3"].includes(String(v.shots))?String(v.shots):"",
    photo: cleanImage(v.photo),
    cardZoom: Math.max(.7,Math.min(5,Number(v.cardZoom)||1)),
    cardX: Math.max(-100,Math.min(100,Number(v.cardX)||0)),
    cardY: Math.max(-100,Math.min(100,Number(v.cardY)||0)),
    cardRotation: Math.max(-360,Math.min(360,Number(v.cardRotation)||0)),
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

export function cleanCafe(value, index=0) {
  const v = value && typeof value === "object" ? value : {};
  const rawImgs = Array.isArray(v.imgs) ? v.imgs : typeof v.imgs === "string" ? [v.imgs] : [];
  const imgs = rawImgs.map(cleanImage).filter(Boolean).slice(0, 6);

  return {
    id: typeof v.id === "string" || typeof v.id === "number" ? v.id : Date.now() + index,
    name: cleanText(v.name, 120) || "Untitled café",
    city: cleanText(v.city, 80),
    country: cleanText(v.country, 80),
    catalogId: cleanText(v.catalogId, 120),
    address: cleanText(v.address, 220),
    lat: Number.isFinite(Number(v.lat)) ? Number(v.lat) : null,
    lng: Number.isFinite(Number(v.lng)) ? Number(v.lng) : null,
    cardZoom: Math.max(0.7, Math.min(5, Number(v.cardZoom) || 1)),
    cardRotation: Math.max(-360, Math.min(360, Number(v.cardRotation)||0)),
    cardX: Math.max(-100, Math.min(100, Number(v.cardX) || 0)),
    cardY: Math.max(-100, Math.min(100, Number(v.cardY) || 0)),
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

