import { useState, useRef, useEffect, useMemo } from "react";

/* ════ TOKENS ════ */
const C = { paper: "#EFE4D2", paper2: "#E7D9C3", cream: "#FBF5EA", creamHi: "#FFFDF8", ink: "#241811", inkSoft: "#7A6450", clay: "#BC5B35", clayDeep: "#9C4423", sage: "#6E8060", sageDeep: "#566848", green: "#5E7B52", amber: "#C2872A", amberDeep: "#9A6A1E", red: "#B0432E", gold: "#CC9F45", goldDeep: "#A87E2B", line: "#E2D3BD" };
const sans = `"Hanken Grotesk", system-ui, sans-serif`;
const serif = `Fraunces, Georgia, serif`;
const S = 2;

/* ════ TAXONOMY ════ */
const DRINKS = [["Flat White", "☕"], ["Latte", "🥛"], ["Cappuccino", "☕"], ["Espresso", "⚡"], ["Americano", "💧"], ["Iced Latte", "🧊"], ["Filter Coffee", "🫗"], ["Matcha Latte", "🍵"], ["Tea", "🫖"], ["Hot Chocolate", "🍫"], ["Seasonal", "🍂"], ["Other", "➕"]];
const PASTRIES = [["Croissant", "🥐"], ["Cardamom Bun", "🌀"], ["Cinnamon Bun", "🐌"], ["Pain au Chocolat", "🍫"], ["Danish", "🥧"], ["Cookie", "🍪"], ["Cake", "🍰"], ["Bread", "🍞"], ["Sourdough", "🥖"], ["Bagel", "🥯"], ["Sandwich", "🥪"], ["Other", "➕"]];
const DRINK_CRIT = { _: ["Taste", "Milk texture", "Temperature", "Strength"], Espresso: ["Taste", "Crema", "Body", "Strength"], Americano: ["Taste", "Body", "Temperature", "Strength"], "Filter Coffee": ["Taste", "Clarity", "Temperature", "Body"], "Matcha Latte": ["Taste", "Smoothness", "Temperature", "Balance"], Tea: ["Taste", "Aroma", "Temperature", "Strength"], "Hot Chocolate": ["Taste", "Richness", "Temperature", "Sweetness"] };
const PASTRY_CRIT = { _: ["Flakiness", "Butter", "Freshness", "Filling"], "Cardamom Bun": ["Flavour", "Texture", "Freshness", "Gooeyness"], "Cinnamon Bun": ["Flavour", "Texture", "Freshness", "Gooeyness"], Bread: ["Crust", "Crumb", "Flavour", "Freshness"], Sourdough: ["Crust", "Crumb", "Flavour", "Tang"], Cookie: ["Flavour", "Texture", "Freshness", "Sweetness"], Cake: ["Flavour", "Moisture", "Freshness", "Sweetness"], Bagel: ["Chew", "Freshness", "Filling", "Flavour"], Sandwich: ["Freshness", "Filling", "Bread", "Flavour"] };
const getCrit = (cat, t) => (cat === "drink" ? DRINK_CRIT : PASTRY_CRIT)[t] || (cat === "drink" ? DRINK_CRIT._ : PASTRY_CRIT._);
const isBlack = (t) => ["Espresso", "Americano", "Filter Coffee"].includes(t);
const MILKS = ["Oat", "Almond", "Soy", "Whole", "None"];
const ROASTS = ["House blend", "Single origin", "Decaf", "Light roast", "Dark roast"];
const PASTRY_SUB = ["Plain", "Almond", "Pistachio", "Chocolate", "Vanilla cream", "Berry", "Cardamom", "Cinnamon"];
const COUNTRIES = [["Denmark", "🇩🇰"], ["Sweden", "🇸🇪"], ["Norway", "🇳🇴"], ["Finland", "🇫🇮"], ["Germany", "🇩🇪"], ["France", "🇫🇷"], ["Netherlands", "🇳🇱"], ["United Kingdom", "🇬🇧"], ["Italy", "🇮🇹"], ["Other", "🏳️"]];
const flagOf = (c) => (COUNTRIES.find((x) => x[0] === c) || ["", "🏳️"])[1];
const CUR = { Denmark: "DKK", Sweden: "SEK", Norway: "NOK", Finland: "EUR", Germany: "EUR", France: "EUR", Netherlands: "EUR", Italy: "EUR", "United Kingdom": "GBP" };
const curOf = (c) => CUR[c] || "DKK";
const SCENES = [["Sunny terrace", "☀️"], ["Winter fika", "❄️"], ["Waterfront", "🌊"], ["Cozy interior", "🪴"], ["Nordic minimal", "🌿"], ["Spring", "🌸"], ["Autumn", "🍂"]];
const sceneEmoji = (l) => (SCENES.find((x) => x[0] === l) || ["", ""])[1];
const BESTFOR = [["Date spot", "💕"], ["Laptop work", "💻"], ["Queer-friendly", "🌈"], ["Friends", "👯"], ["Cozy solo", "🧘"], ["Instagrammable", "📸"], ["Tourist-worthy", "🗺️"], ["Hidden gem", "✨"]];
const bfEmoji = (l) => (BESTFOR.find((x) => x[0] === l) || ["", "•"])[1];
const FORMATS = { reel: { label: "Reel / Story", sub: "9:16", w: 1080, h: 1920 }, feed: { label: "IG Portrait", sub: "4:5", w: 1080, h: 1350 }, post: { label: "Square", sub: "1:1", w: 1080, h: 1080 }, overlay: { label: "Overlay", sub: "PNG", w: 1080, h: 1920, transparent: true } };
const CARD_TYPES = [["hero", "Hero"], ["drink", "Drink"], ["pastry", "Pastry"], ["vibe", "Vibe"]];

/* per-card score identity */
const SCORE_ID = { hero: { label: "FIKA SCORE™", a: C.gold, d: C.goldDeep }, drink: { label: "DRINK SCORE™", a: C.clay, d: C.clayDeep }, pastry: { label: "PASTRY SCORE™", a: C.amber, d: C.amberDeep }, vibe: { label: "VIBE SCORE™", a: C.sage, d: C.sageDeep } };

const heroImgH = (f) => f === "post" ? 540 : f === "feed" ? 700 : 1000;
const detailImgH = (f) => f === "post" ? 600 : f === "feed" ? 820 : 1140;
const vibeImgH = (f) => f === "post" ? 520 : f === "feed" ? 700 : 1000;
const imgHFor = (ctype, fmt) => ctype === "vibe" ? vibeImgH(fmt) : ctype === "drink" || ctype === "pastry" ? detailImgH(fmt) : heroImgH(fmt);

/* ════ SCORING (context-aware, auto-normalized) ════ */
function itemScore(item, cat) { if (!item?.type) return null; const v = getCrit(cat, item.type).map((c) => item.ratings?.[c] || 0); if (v.some((x) => x === 0)) return null; return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 2 * 10) / 10; }
function weighted(pairs) { const present = pairs.filter(([v]) => v != null); if (!present.length) return null; const ws = present.reduce((a, [, w]) => a + w, 0); return Math.round((present.reduce((a, [v, w]) => a + v * w, 0) / ws) * 10) / 10; }
function overall(d) { return weighted([[itemScore(d.drink, "drink"), 0.35], [itemScore(d.pastry, "pastry"), 0.25], [d.atmosphere ? d.atmosphere * 2 : null, 0.20], [d.service ? d.service * 2 : null, 0.10], [d.value ? d.value * 2 : null, 0.10]]); }
function vibeScore(d) { return weighted([[d.atmosphere ? d.atmosphere * 2 : null, 0.45], [d.service ? d.service * 2 : null, 0.35], [d.value ? d.value * 2 : null, 0.20]]); }
function scoreForCard(ctype, d) { return ctype === "drink" ? itemScore(d.drink, "drink") : ctype === "pastry" ? itemScore(d.pastry, "pastry") : ctype === "vibe" ? vibeScore(d) : overall(d); }
function verdictFor(s) { if (s == null) return { label: "UNRATED", emoji: "·", color: C.inkSoft }; if (s >= 9) return { label: "A PILGRIMAGE", emoji: "⭐", color: C.goldDeep }; if (s >= 8) return { label: "WORTH THE TRIP", emoji: "✅", color: C.green }; if (s >= 6.5) return { label: "ONLY IF NEARBY", emoji: "⚠️", color: C.amber }; return { label: "OVERRATED", emoji: "❌", color: C.red }; }
function itemDisplay(item, cat) { if (!item?.type) return null; if (cat === "drink") { const iced = item.temp === "Iced" && !item.type.includes("Iced"); return { name: (iced ? "Iced " : "") + item.type, paren: item.mod && item.mod !== "None" ? item.mod : "" }; } return { name: item.type, paren: item.subtype || "" }; }
function modLine(item, cat) { if (!item?.type) return ""; if (cat === "drink") return [item.mod && item.mod !== "None" ? item.mod : null, item.temp || "Hot"].filter(Boolean).join(" • "); return item.subtype || ""; }
function bestThing(d) { const a = []; const ds = itemScore(d.drink, "drink"), ps = itemScore(d.pastry, "pastry"); if (ds != null) a.push([d.drink.type, ds]); if (ps != null) a.push([d.pastry.type, ps]); if (!a.length) return null; return a.sort((x, y) => y[1] - x[1])[0][0]; }

/* ════ CANVAS HELPERS ════ */
function rr(ctx, x, y, w, h, r) { if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; } ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function coverFocal(ctx, img, dx, dy, dw, dh, zoom = 1, fx = 0.5, fy = 0.5) { const base = Math.max(dw / img.width, dh / img.height) * zoom; let sw = Math.min(dw / base, img.width), sh = Math.min(dh / base, img.height); let sx = Math.max(0, Math.min((img.width - sw) * fx, img.width - sw)); let sy = Math.max(0, Math.min((img.height - sh) * fy, img.height - sh)); ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh); }
function placeholder(ctx, x, y, w, h) { const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h); g.addColorStop(0, "#CBA079"); g.addColorStop(0.55, "#A2734C"); g.addColorStop(1, "#6F4A30"); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 0.16; ctx.font = `${h * 0.42}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("☕", x + w / 2, y + h / 2); ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic"; }
function wrap(ctx, text, maxW, maxLines) { const words = (text || "").split(/\s+/); const lines = []; let cur = ""; for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; if (maxLines && lines.length === maxLines) break; } if (cur && (!maxLines || lines.length < maxLines)) lines.push(cur); if (maxLines && lines.length === maxLines && lines[maxLines - 1] !== cur && cur) { let last = lines[maxLines - 1]; while (ctx.measureText(last + "…").width > maxW && last.length) last = last.slice(0, -1); lines[maxLines - 1] = last + "…"; } return lines; }
function tracked(ctx, text, x, y, sp) { let cx = x; ctx.textAlign = "left"; for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; } return cx; }
function pill(ctx, x, y, txt, font, pad, h, bg, fg) { ctx.font = font; const w = ctx.measureText(txt).width + pad * 2; ctx.fillStyle = bg; rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText(txt, x + pad, y + h / 2 + 1); ctx.textBaseline = "alphabetic"; return w; }
function medallion(ctx, cx, cy, R, score, id, transparent) { ctx.save(); ctx.shadowColor = "rgba(20,12,5,0.4)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = transparent ? "#fff" : C.creamHi; ctx.fill(); ctx.restore(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.92, 0, 7); ctx.lineWidth = R * 0.03; ctx.strokeStyle = id.a; ctx.stroke(); ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `700 ${R * 0.84}px ${serif}`; ctx.fillText(score != null ? score.toFixed(1) : "–", cx, cy - R * 0.14); ctx.fillStyle = id.d; ctx.font = `800 ${R * 0.125}px ${sans}`; ctx.textBaseline = "alphabetic"; const sp = R * 0.024; const tw = [...id.label].reduce((a, ch) => a + ctx.measureText(ch).width + sp, -sp); tracked(ctx, id.label, cx - tw / 2, cy + R * 0.5, sp); }
function header(ctx, W, d) { let x = 72; x += pill(ctx, x, 56, `📍 ${[d.city, d.country].filter(Boolean).join(", ")} ${flagOf(d.country)}`, `700 28px ${sans}`, 22, 54, "rgba(15,9,4,0.52)", "#FBF5EA") + 12; if (d.scene) { ctx.font = `700 28px ${sans}`; const t = `${sceneEmoji(d.scene)} ${d.scene}`; const w = ctx.measureText(t).width + 44; pill(ctx, W - 72 - w, 56, t, `700 28px ${sans}`, 22, 54, "rgba(15,9,4,0.52)", "#FBF5EA"); } }
function topScrim(ctx, W) { const g = ctx.createLinearGradient(0, 0, 0, 230); g.addColorStop(0, "rgba(10,6,2,0.55)"); g.addColorStop(1, "rgba(10,6,2,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 230); }
function botScrim(ctx, W, H) { const g = ctx.createLinearGradient(0, H * 0.32, 0, H); g.addColorStop(0, "rgba(12,7,3,0)"); g.addColorStop(1, "rgba(12,7,3,0.62)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function footer(ctx, W, H, d, cur, transparent) { const total = (d.drink?.price || 0) + (d.pastry?.price || 0); if (!transparent) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(72, H - 92); ctx.lineTo(W - 72, H - 92); ctx.stroke(); } ctx.fillStyle = transparent ? C.gold : C.goldDeep; ctx.font = `800 26px ${sans}`; tracked(ctx, "✨ FIKA REVIEWS", 72, H - 50, 2); ctx.fillStyle = transparent ? "rgba(251,245,234,0.85)" : C.inkSoft; ctx.font = `700 26px ${sans}`; ctx.textAlign = "right"; ctx.fillText(`${d.handle || "@WorthTheFika"}${total ? `   ·   ${total} ${cur}` : ""}`, W - 72, H - 50); ctx.textAlign = "left"; }
function critBar(ctx, x, y, w, label, val) { ctx.fillStyle = C.ink; ctx.font = `700 32px ${sans}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(label, x, y); ctx.fillStyle = C.paper2; rr(ctx, x, y + 28, w, 16, 8); ctx.fill(); ctx.fillStyle = C.clay; rr(ctx, x, y + 28, w * (val / 5), 16, 8); ctx.fill(); ctx.fillStyle = C.clayDeep; ctx.font = `700 30px ${serif}`; ctx.textAlign = "right"; ctx.fillText(`${val}/5`, x + w, y); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }

/* ════ HERO ════ */
function drawHero(ctx, W, H, d, fmt) {
  const transparent = !!FORMATS[fmt]?.transparent; const s = overall(d), v = verdictFor(s), cur = curOf(d.country), PX = 80;
  const cfg = d.imgs?.hero || {}, img = cfg.img; const imgH = transparent ? 0 : heroImgH(fmt);
  if (transparent) { ctx.clearRect(0, 0, W, H); botScrim(ctx, W, H); } else { ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H); if (img) coverFocal(ctx, img, 0, 0, W, imgH, cfg.zoom, cfg.fx, cfg.fy); else placeholder(ctx, 0, 0, W, imgH); topScrim(ctx, W); ctx.fillStyle = C.gold; ctx.fillRect(0, imgH - 3, W, 3); }
  header(ctx, W, d);
  const R = fmt === "post" ? 90 : 110; medallion(ctx, W - PX - R + 8, transparent ? 150 + R : imgH - R - 28, R, s, SCORE_ID.hero, transparent);
  const INK = transparent ? "#FBF5EA" : C.ink, SOFT = transparent ? "rgba(251,245,234,0.85)" : C.inkSoft;
  const sh = (on) => { if (transparent) { ctx.shadowColor = on ? "rgba(0,0,0,0.6)" : "transparent"; ctx.shadowBlur = on ? 14 : 0; } };
  let y = transparent ? Math.round(H * 0.4) : imgH + 100;
  ctx.textAlign = "left"; sh(true); ctx.fillStyle = INK; const ns = fmt === "post" ? 76 : 94; ctx.font = `700 ${ns}px ${serif}`;
  const nl = wrap(ctx, d.name || "Café", W - PX * 2, 2); nl.forEach((l, i) => ctx.fillText(l, PX, y + i * (ns * 0.98))); y += nl.length * (ns * 0.98) + 40; sh(false);
  ctx.textBaseline = "middle"; pill(ctx, PX, y, `${v.emoji}  ${v.label}`, `800 32px ${sans}`, 26, 62, v.color, "#fff"); y += 62; ctx.textBaseline = "alphabetic";
  if (d.reason) { sh(true); ctx.fillStyle = SOFT; ctx.font = `italic 400 30px ${serif}`; wrap(ctx, d.reason, W - PX * 2, 1).forEach((l) => ctx.fillText(l, PX, y + 38)); sh(false); y += 50; }
  y += 26; if (!transparent) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PX, y); ctx.lineTo(W - PX, y); ctx.stroke(); } y += 40;
  const row = (item, cat) => { const disp = itemDisplay(item, cat); if (!disp) return; const sc = itemScore(item, cat); const e = (cat === "drink" ? DRINKS : PASTRIES).find((x) => x[0] === item.type)?.[1] || "•"; sh(true); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = "42px serif"; ctx.fillStyle = INK; ctx.fillText(e, PX, y + 18); ctx.font = `700 40px ${serif}`; ctx.fillText(disp.name, PX + 60, y + 16); const w1 = ctx.measureText(disp.name).width; if (disp.paren) { ctx.font = `600 27px ${sans}`; ctx.fillStyle = SOFT; ctx.fillText(`(${disp.paren})`, PX + 60 + w1 + 12, y + 18); } ctx.textAlign = "right"; if (item.price) { ctx.font = `700 28px ${sans}`; ctx.fillStyle = SOFT; ctx.fillText(`${item.price} ${cur}`, W - PX, y + 17); } ctx.font = `700 46px ${serif}`; ctx.fillStyle = transparent ? C.gold : C.clay; ctx.fillText(sc != null ? sc.toFixed(1) : "–", W - PX - (item.price ? 150 : 0), y + 16); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; sh(false); y += 70; };
  row(d.drink, "drink"); row(d.pastry, "pastry");
  const parts = []; if (d.atmosphere) parts.push(`✨ Atmosphere ${(d.atmosphere * 2).toFixed(1)}`); if (d.service) parts.push(`🤍 Service ${(d.service * 2).toFixed(1)}`); if (d.value) parts.push(`💰 Value ${(d.value * 2).toFixed(1)}`);
  if (parts.length && y < H - 330) { y += 6; if (!transparent) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PX, y); ctx.lineTo(W - PX, y); ctx.stroke(); } y += 34; sh(true); ctx.textBaseline = "middle"; ctx.fillStyle = SOFT; ctx.font = `700 28px ${sans}`; ctx.fillText(parts.join("    ·    "), PX, y + 6); sh(false); y += 50; ctx.textBaseline = "alphabetic"; }
  const bt = bestThing(d);
  if (bt && !d.take && y < H - 290) { sh(true); ctx.fillStyle = transparent ? C.gold : C.goldDeep; ctx.font = `800 26px ${sans}`; ctx.fillText(`🏆 Best here — ${bt}`, PX, y + 14); sh(false); y += 52; }
  if (d.bestFor?.length && y < H - 230) { let tx = PX; y += 4; ctx.font = `700 26px ${sans}`; ctx.textBaseline = "middle"; d.bestFor.slice(0, 3).forEach((b) => { const t = `${bfEmoji(b)} ${b}`, w = ctx.measureText(t).width + 36; if (tx + w > W - PX) return; const q = b === "Queer-friendly"; if (q) { const gg = ctx.createLinearGradient(tx, 0, tx + w, 0);["#E8755B", "#E8B65B", "#7E8E6A", "#5B8FE8", "#9B6BD9"].forEach((c, i, a) => gg.addColorStop(i / (a.length - 1), c)); ctx.fillStyle = gg; } else ctx.fillStyle = transparent ? "rgba(255,255,255,0.2)" : C.paper2; rr(ctx, tx, y, w, 50, 25); ctx.fill(); ctx.fillStyle = q ? "#fff" : (transparent ? "#fff" : C.clayDeep); ctx.fillText(t, tx + 18, y + 26); tx += w + 12; }); y += 72; ctx.textBaseline = "alphabetic"; }
  if (d.take && y < H - 150) { sh(true); ctx.fillStyle = C.gold; ctx.font = `700 60px ${serif}`; ctx.fillText("“", PX, y + 34); ctx.fillStyle = INK; ctx.font = `italic 500 38px ${serif}`; wrap(ctx, d.take, W - PX * 2 - 40, 2).forEach((l, i) => ctx.fillText(l, PX + 42, y + 28 + i * 46)); sh(false); }
  footer(ctx, W, H, d, cur, transparent);
}

/* ════ DETAIL ════ */
function drawDetail(ctx, W, H, d, fmt, cat) {
  const transparent = !!FORMATS[fmt]?.transparent;
  const item = d[cat], disp = itemDisplay(item, cat), sc = itemScore(item, cat), cur = curOf(d.country), PX = 80, id = SCORE_ID[cat];
  const FOOT = H - 124, G = 72;
  const INK = transparent ? "#FBF5EA" : C.ink, SOFT = transparent ? "rgba(251,245,234,0.85)" : C.inkSoft;
  const sh = (on) => { if (transparent) { ctx.shadowColor = on ? "rgba(0,0,0,0.6)" : "transparent"; ctx.shadowBlur = on ? 14 : 0; } };
  // ── measure content first, then size the flexible image to whatever space remains ──
  ctx.font = `700 84px ${serif}`; const tl = wrap(ctx, disp ? disp.name : "—", W - PX * 2, 2);
  const crit = item?.type ? getCrit(cat, item.type) : [];
  const ml = modLine(item, cat);
  const headH = 92 + tl.length * 80 + 8 + (ml ? 50 : 0) + (item?.price ? 64 : 18) + 42;
  const noteH = 132;
  let rowH = 92, showNote = !!item?.note;
  let imgH = transparent ? 0 : Math.min(detailImgH(fmt), FOOT - G - headH - (showNote ? noteH : 0) - crit.length * rowH);
  if (!transparent && imgH < 380) {
    imgH = 380; let space = FOOT - G - imgH - headH;
    if (showNote && (space - noteH) / Math.max(1, crit.length) < 60) showNote = false;
    if (showNote) space -= noteH;
    rowH = crit.length ? Math.max(52, Math.min(92, space / crit.length)) : 0;
  }
  // ── paint ──
  if (transparent) { ctx.clearRect(0, 0, W, H); botScrim(ctx, W, H); }
  else { ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H); const cfg = d.imgs?.[cat]?.src ? d.imgs[cat] : d.imgs?.hero || {}; if (cfg.img) coverFocal(ctx, cfg.img, 0, 0, W, imgH, cfg.zoom, cfg.fx, cfg.fy); else placeholder(ctx, 0, 0, W, imgH); topScrim(ctx, W); ctx.fillStyle = C.gold; ctx.fillRect(0, imgH - 3, W, 3); }
  header(ctx, W, d);
  const R = 112; medallion(ctx, W - PX - R + 8, transparent ? 150 + R : imgH - R - 28, R, sc, id, transparent);
  let y = transparent ? Math.round(H * 0.34) : imgH + G; ctx.textAlign = "left";
  // SECTION LABEL
  sh(false); ctx.fillStyle = id.d; ctx.font = `800 24px ${sans}`; tracked(ctx, cat === "drink" ? "☕  DRINK BREAKDOWN" : "🥐  PASTRY BREAKDOWN", PX, y, 3); y += 92;
  // MAIN TITLE
  sh(true); ctx.fillStyle = INK; ctx.font = `700 84px ${serif}`; tl.forEach((l, i) => ctx.fillText(l, PX, y + i * 80)); y += tl.length * 80 + 8;
  // VARIANT
  if (ml) { ctx.fillStyle = SOFT; ctx.font = `600 36px ${sans}`; ctx.fillText(ml, PX, y + 30); y += 50; }
  sh(false);
  // PRICE
  if (item?.price) { ctx.fillStyle = transparent ? C.gold : C.clay; ctx.font = `800 40px ${sans}`; ctx.fillText(`${item.price} ${cur}`, PX, y + 34); y += 64; } else y += 18;
  // DIVIDER
  if (!transparent) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PX, y); ctx.lineTo(W - PX, y); ctx.stroke(); } y += 42;
  // METRICS (only non-transparent; rowH already fits above footer)
  if (crit.length && !transparent) { crit.forEach((c) => { critBar(ctx, PX, y, W - PX * 2, c, item.ratings?.[c] || 0); y += rowH; }); y += 10; }
  // CREATOR TAKE
  if (item?.note && showNote && y < FOOT - 30) { sh(true); ctx.fillStyle = C.gold; ctx.font = `700 56px ${serif}`; ctx.fillText("\u201C", PX, y + 26); ctx.fillStyle = INK; ctx.font = `italic 500 36px ${serif}`; wrap(ctx, item.note, W - PX * 2 - 40, 2).forEach((l, i) => ctx.fillText(l, PX + 42, y + 22 + i * 44)); sh(false); }
  footer(ctx, W, H, d, cur, transparent);
}

/* ════ VIBE ════ */
function drawVibe(ctx, W, H, d, fmt) {
  const transparent = !!FORMATS[fmt]?.transparent;
  const cur = curOf(d.country), PX = 80, id = SCORE_ID.vibe, sc = vibeScore(d);
  const FOOT = H - 124, G = 72;
  const INK = transparent ? "#FBF5EA" : C.ink, SOFT = transparent ? "rgba(251,245,234,0.85)" : C.inkSoft;
  const sh = (on) => { if (transparent) { ctx.shadowColor = on ? "rgba(0,0,0,0.6)" : "transparent"; ctx.shadowBlur = on ? 14 : 0; } };
  // ── measure, then size the flexible image; gracefully drop optional blocks if a tiny format can't fit them ──
  const base = 92 + 88 + (d.scene ? 50 : 0) + 30 + 64 + 168; // label+name+scene+gap+divider+stats
  const whoH = d.bestFor?.length ? 130 : 0, takeH = d.take ? 110 : 0;
  let imgH = transparent ? 0 : Math.max(300, Math.min(vibeImgH(fmt), FOOT - G - base - whoH - takeH));
  const avail = transparent ? (FOOT - Math.round(H * 0.30)) : (FOOT - G - imgH);
  const room = avail - base;
  const showWho = !!d.bestFor?.length && room >= whoH;
  const showTake = !!d.take && (room - (showWho ? whoH : 0)) >= takeH;
  // ── paint ──
  if (transparent) { ctx.clearRect(0, 0, W, H); botScrim(ctx, W, H); }
  else { ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H); const cfg = d.imgs?.vibe?.src ? d.imgs.vibe : d.imgs?.hero || {}; if (cfg.img) coverFocal(ctx, cfg.img, 0, 0, W, imgH, cfg.zoom, cfg.fx, cfg.fy); else placeholder(ctx, 0, 0, W, imgH); topScrim(ctx, W); ctx.fillStyle = C.gold; ctx.fillRect(0, imgH - 3, W, 3); }
  header(ctx, W, d);
  const R = 112; medallion(ctx, W - PX - R + 8, transparent ? 150 + R : imgH - R - 28, R, sc, id, transparent);
  let y = transparent ? Math.round(H * 0.30) : imgH + G; ctx.textAlign = "left";
  sh(false); ctx.fillStyle = id.d; ctx.font = `800 24px ${sans}`; tracked(ctx, "🪴  THE VIBE", PX, y, 3); y += 92;
  sh(true); ctx.fillStyle = INK; ctx.font = `700 84px ${serif}`; wrap(ctx, d.name || "Café", W - PX * 2, 1).forEach((l) => ctx.fillText(l, PX, y + 4)); y += 12;
  if (d.scene) { ctx.fillStyle = SOFT; ctx.font = `600 36px ${sans}`; ctx.fillText(`${sceneEmoji(d.scene)} ${d.scene}`, PX, y + 32); y += 50; } sh(false); y += 30;
  if (!transparent) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PX, y); ctx.lineTo(W - PX, y); ctx.stroke(); } y += 64;
  const cols = [["✨", "Atmosphere", d.atmosphere], ["🤍", "Service", d.service], ["💰", "Value", d.value]]; const cw = (W - PX * 2) / 3;
  cols.forEach((c, i) => { const cx = PX + cw * i + cw / 2; ctx.textAlign = "center"; sh(true); ctx.fillStyle = INK; ctx.font = "46px serif"; ctx.fillText(c[0], cx, y); ctx.fillStyle = transparent ? C.gold : C.clay; ctx.font = `700 76px ${serif}`; ctx.fillText(c[2] ? (c[2] * 2).toFixed(1) : "\u2013", cx, y + 78); ctx.fillStyle = SOFT; ctx.font = `700 23px ${sans}`; ctx.fillText(c[1].toUpperCase(), cx, y + 116); sh(false); });
  ctx.textAlign = "left"; y += 168;
  if (showWho) { sh(false); ctx.fillStyle = id.d; ctx.font = `800 24px ${sans}`; tracked(ctx, "WHO IT'S FOR", PX, y, 2); y += 42; let tx = PX; ctx.font = `700 28px ${sans}`; ctx.textBaseline = "middle"; d.bestFor.slice(0, 3).forEach((b) => { const t = `${bfEmoji(b)} ${b}`, w = ctx.measureText(t).width + 40; if (tx + w > W - PX) { tx = PX; y += 64; } const q = b === "Queer-friendly"; if (q) { const gg = ctx.createLinearGradient(tx, 0, tx + w, 0);["#E8755B", "#E8B65B", "#7E8E6A", "#5B8FE8", "#9B6BD9"].forEach((c, i, a) => gg.addColorStop(i / (a.length - 1), c)); ctx.fillStyle = gg; } else ctx.fillStyle = transparent ? "rgba(255,255,255,0.2)" : C.paper2; rr(ctx, tx, y, w, 56, 28); ctx.fill(); ctx.fillStyle = q ? "#fff" : (transparent ? "#fff" : C.clayDeep); ctx.fillText(t, tx + 20, y + 29); tx += w + 14; }); y += 88; ctx.textBaseline = "alphabetic"; }
  if (showTake) { sh(true); ctx.fillStyle = C.gold; ctx.font = `700 58px ${serif}`; ctx.fillText("\u201C", PX, y + 28); ctx.fillStyle = INK; ctx.font = `italic 500 38px ${serif}`; wrap(ctx, d.take, W - PX * 2 - 40, 2).forEach((l, i) => ctx.fillText(l, PX + 42, y + 24 + i * 46)); sh(false); }
  footer(ctx, W, H, d, cur, transparent);
}

function drawLeaderboard(ctx, W, H, list, handle, title, sub) { const rg = ctx.createRadialGradient(W / 2, H * 0.26, 80, W / 2, H * 0.3, H); rg.addColorStop(0, "#3C2716"); rg.addColorStop(1, "#160C05"); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); const PX = 76; ctx.textAlign = "left"; ctx.fillStyle = C.gold; ctx.font = `800 26px ${sans}`; tracked(ctx, "✨ FIKA REVIEWS", PX, 110, 3); ctx.fillStyle = C.cream; ctx.font = `700 86px ${serif}`; const tl = wrap(ctx, title, W - PX * 2, 2); tl.forEach((l, i) => ctx.fillText(l, PX, 216 + i * 88)); ctx.fillStyle = "rgba(251,245,234,0.5)"; ctx.font = `700 28px ${sans}`; tracked(ctx, (sub || "").toUpperCase(), PX, 216 + tl.length * 88 + 18, 2); const rows = list.slice(0, 5), top = 430, rh = (H - top - 130) / 5; rows.forEach((r, i) => { const ry = top + i * rh; ctx.strokeStyle = "rgba(204,159,69,0.22)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PX, ry); ctx.lineTo(W - PX, ry); ctx.stroke(); ctx.fillStyle = i === 0 ? C.gold : "rgba(251,245,234,0.38)"; ctx.font = `700 ${i === 0 ? 94 : 76}px ${serif}`; ctx.textAlign = "left"; ctx.fillText(`${i + 1}`, PX, ry + rh / 2 + 28); ctx.fillStyle = C.cream; ctx.font = `700 ${i === 0 ? 52 : 46}px ${serif}`; ctx.fillText(wrap(ctx, r.name, W - PX * 2 - 330, 1)[0], PX + 124, ry + rh / 2 - 4); ctx.fillStyle = "rgba(251,245,234,0.5)"; ctx.font = `600 26px ${sans}`; ctx.fillText([r.sub, r.city].filter(Boolean).join(" · ").toUpperCase(), PX + 124, ry + rh / 2 + 34); ctx.textAlign = "right"; ctx.fillStyle = C.gold; ctx.font = `700 70px ${serif}`; ctx.fillText(r.score != null ? r.score.toFixed(1) : "–", W - PX, ry + rh / 2 + 24); ctx.textAlign = "left"; }); ctx.fillStyle = "rgba(251,245,234,0.55)"; ctx.font = `700 28px ${sans}`; ctx.fillText(`${handle}   ·   FIKA SCORE™`, PX, H - 64); }

/* ════ CANVAS ════ */
function CardCanvas({ data, fmt, kind, ctype, list, handle, title, sub, onReady }) {
  const ref = useRef(); const [fonts, setFonts] = useState(false); const [imgs, setImgs] = useState({});
  useEffect(() => { Promise.all(['700 90px Fraunces', 'italic 500 40px Fraunces', '700 30px "Hanken Grotesk"', '800 30px "Hanken Grotesk"'].map((f) => document.fonts.load(f).catch(() => {}))).then(() => document.fonts.ready).then(() => setFonts(true)); }, []);
  useEffect(() => { const s = data?.imgs || {}; Object.entries(s).forEach(([k, cfg]) => { if (cfg?.src) { const im2 = new Image(); im2.onload = () => setImgs((p) => ({ ...p, [k + ":" + cfg.src.length]: im2, [k]: im2 })); im2.src = cfg.src; } }); }, [data?.imgs?.hero?.src, data?.imgs?.drink?.src, data?.imgs?.pastry?.src, data?.imgs?.vibe?.src]);
  useEffect(() => { const cv = ref.current; if (!cv) return; const f = FORMATS[fmt]; cv.width = f.w * S; cv.height = f.h * S; const ctx = cv.getContext("2d"); ctx.setTransform(S, 0, 0, S, 0, 0); const m = { ...data }; if (data?.imgs) { m.imgs = {}; Object.entries(data.imgs).forEach(([k, cfg]) => m.imgs[k] = { ...cfg, img: imgs[k] }); } if (kind === "leaderboard") drawLeaderboard(ctx, f.w, f.h, list, handle, title, sub); else if (ctype === "drink") drawDetail(ctx, f.w, f.h, m, fmt, "drink"); else if (ctype === "pastry") drawDetail(ctx, f.w, f.h, m, fmt, "pastry"); else if (ctype === "vibe") drawVibe(ctx, f.w, f.h, m, fmt); else drawHero(ctx, f.w, f.h, m, fmt); onReady && onReady(cv); }, [data, fmt, kind, ctype, imgs, fonts, list, handle, title, sub]);
  return <canvas ref={ref} style={{ width: "100%", height: "auto", display: "block", borderRadius: 20, boxShadow: "0 30px 70px rgba(40,24,10,0.5)", background: FORMATS[fmt]?.transparent ? "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0/24px 24px" : "none" }} />;
}

/* ════ CROP ════ */
function CropView({ cfg, aspect, onChange }) {
  const ref = useRef(); const wrap2 = useRef(); const [img, setImg] = useState(null); const drag = useRef(null); const pinch = useRef(null);
  useEffect(() => { if (!cfg.src) { setImg(null); return; } const im2 = new Image(); im2.onload = () => setImg(im2); im2.src = cfg.src; }, [cfg.src]);
  useEffect(() => { const cv = ref.current; if (!cv) return; const W = 1080, H = Math.round(W / aspect); cv.width = W; cv.height = H; const ctx = cv.getContext("2d"); ctx.fillStyle = C.paper2; ctx.fillRect(0, 0, W, H); if (img) coverFocal(ctx, img, 0, 0, W, H, cfg.zoom, cfg.fx, cfg.fy); }, [img, cfg.zoom, cfg.fx, cfg.fy, aspect]);
  const pt = (e) => e.touches ? e.touches[0] : e;
  const start = (e) => { if (e.touches && e.touches.length === 2) { const [a, b] = e.touches; pinch.current = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: cfg.zoom }; } else { const p = pt(e); drag.current = { x: p.clientX, y: p.clientY }; } };
  const move = (e) => { const r = wrap2.current.getBoundingClientRect(); if (e.touches && e.touches.length === 2 && pinch.current) { const [a, b] = e.touches; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); onChange({ zoom: Math.max(1, Math.min(4, pinch.current.z * (d / pinch.current.d))) }); e.preventDefault?.(); return; } if (!drag.current) return; const p = pt(e); const dx = (p.clientX - drag.current.x) / r.width, dy = (p.clientY - drag.current.y) / r.height; drag.current = { x: p.clientX, y: p.clientY }; onChange({ fx: Math.max(0, Math.min(1, cfg.fx - dx)), fy: Math.max(0, Math.min(1, cfg.fy - dy)) }); e.preventDefault?.(); };
  const end = () => { drag.current = null; pinch.current = null; };
  return (<div ref={wrap2} onMouseDown={start} onMouseMove={(e) => drag.current && move(e)} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} style={{ position: "relative", touchAction: "none", cursor: "grab", borderRadius: 18, overflow: "hidden", boxShadow: "0 20px 50px rgba(40,24,10,0.4)" }}><canvas ref={ref} style={{ width: "100%", height: "auto", display: "block" }} /><div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{[33.33, 66.66].map((p) => <div key={"v" + p} style={{ position: "absolute", left: p + "%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.45)" }} />)}{[33.33, 66.66].map((p) => <div key={"h" + p} style={{ position: "absolute", top: p + "%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.45)" }} />)}<div style={{ position: "absolute", inset: 8, border: "2px solid rgba(255,255,255,0.7)", borderRadius: 10 }} /></div></div>);
}

/* ════ AI ════ */
const AI_ENDPOINT = (import.meta && import.meta.env && import.meta.env.VITE_AI_ENDPOINT) || "/.netlify/functions/anthropic";
const PLACES_ENDPOINT = (import.meta && import.meta.env && import.meta.env.VITE_PLACES_ENDPOINT) || "/.netlify/functions/places";
const ADMIN_CODE = (import.meta && import.meta.env && import.meta.env.VITE_ADMIN_CODE) || "fika-admin";
const mapsUrl = (d) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([d.name, d.city, d.country].filter(Boolean).join(" "));
async function callClaude(messages, system) { const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 30000); let res; try { res = await fetch(AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, system }), signal: ctrl.signal }); } finally { clearTimeout(t); } if (!res.ok) throw new Error("HTTP " + res.status); const data = await res.json(); return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n"); }
const parseJSON = (t) => { try { return JSON.parse((t || "").replace(/```json|```/g, "").trim()); } catch { return null; } };

/* ════ PRIMITIVES ════ */
function Cups({ value, onChange, small }) { return <div style={{ display: "flex", gap: small ? 5 : 7 }}>{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => onChange(value === n ? 0 : n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: small ? 22 : 27, lineHeight: 1, transition: "transform .1s,opacity .1s", opacity: n <= value ? 1 : 0.2, transform: n <= value ? "scale(1.1)" : "scale(1)" }}>☕</button>)}</div>; }
function Chip({ active, children, onClick, queer, dim }) { return <button onClick={onClick} style={{ border: "none", cursor: dim ? "default" : "pointer", borderRadius: 22, padding: "8px 14px", fontFamily: sans, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", opacity: dim ? 0.35 : 1, background: active ? (queer ? "linear-gradient(90deg,#E8755B,#E8B65B,#7E8E6A,#5B8FE8,#9B6BD9)" : C.clay) : "rgba(255,255,255,0.55)", color: active ? "#fff" : C.inkSoft, boxShadow: active ? "0 3px 10px rgba(188,91,53,0.3)" : "inset 0 0 0 1px " + C.line }}>{children}</button>; }
function Seg({ options, value, onChange }) { return <div style={{ display: "flex", gap: 6 }}>{options.map((o) => <button key={o} onClick={() => onChange(o)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: sans, fontWeight: 700, fontSize: 13, background: value === o ? C.ink : "rgba(255,255,255,0.55)", color: value === o ? C.cream : C.inkSoft, boxShadow: value === o ? "none" : "inset 0 0 0 1px " + C.line }}>{o}</button>)}</div>; }
function ItemSection({ cat, item, onChange }) { const types = cat === "drink" ? DRINKS : PASTRIES; const set = (p) => onChange({ ...item, ...p }); const crit = item.type ? getCrit(cat, item.type) : null; const mods = cat === "drink" ? (isBlack(item.type) ? ROASTS : MILKS) : PASTRY_SUB; const sc = itemScore(item, cat); return (<div style={{ background: "rgba(255,255,255,0.5)", borderRadius: 18, padding: 14, marginBottom: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: item.type ? 12 : 10 }}><span style={{ fontFamily: sans, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, color: C.clay }}>{cat === "drink" ? "☕ DRINK" : "🥐 PASTRY"}</span>{sc != null && <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 20, color: C.clay }}>{sc.toFixed(1)}<span style={{ fontFamily: sans, fontSize: 11, color: C.inkSoft }}> /10</span></span>}</div>{!item.type ? (<div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>{types.map(([t, e]) => <button key={t} onClick={() => set({ type: t, ratings: {}, temp: t === "Iced Latte" ? "Iced" : "Hot" })} style={{ border: "none", cursor: "pointer", background: "rgba(255,255,255,0.6)", borderRadius: 14, padding: "12px 4px", boxShadow: "inset 0 0 0 1px " + C.line, fontFamily: sans }}><div style={{ fontSize: 24 }}>{e}</div><div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink, marginTop: 3, lineHeight: 1.1 }}>{t}</div></button>)}</div>) : (<><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: C.ink }}>{types.find((x) => x[0] === item.type)?.[1]} {item.type}</span><button onClick={() => set({ type: "", mod: "", subtype: "", temp: "Hot", note: "", ratings: {} })} style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer", fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.clay }}>change</button></div>{cat === "drink" && <div style={{ marginBottom: 10 }}><Seg options={["Hot", "Iced"]} value={item.temp || "Hot"} onChange={(t) => set({ temp: t })} /></div>}<div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>{mods.map((m) => <Chip key={m} active={(cat === "drink" ? item.mod : item.subtype) === m} onClick={() => set(cat === "drink" ? { mod: item.mod === m ? "" : m } : { subtype: item.subtype === m ? "" : m })}>{m}</Chip>)}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginBottom: 12 }}>{crit.map((c) => <div key={c} style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.inkSoft }}>{c}</span><Cups small value={item.ratings?.[c] || 0} onChange={(n) => set({ ratings: { ...item.ratings, [c]: n } })} /></div>)}</div><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Price</span><input type="number" inputMode="numeric" value={item.price || ""} onChange={(e) => set({ price: e.target.value ? +e.target.value : 0 })} placeholder="48" style={{ width: 80, ...inputS }} /></div><input value={item.note || ""} onChange={(e) => set({ note: e.target.value })} placeholder="Tasting note (for detail card)…" style={{ ...inputS, width: "100%", fontFamily: serif, fontStyle: "italic", fontSize: 14 }} /></>)}</div>); }

/* ════ SEED ════ */
const im = () => ({ src: null, zoom: 1, fx: 0.5, fy: 0.5 });
const mk = (o) => ({ mod: "", subtype: "", temp: "Hot", price: 0, note: "", ratings: {}, ...o });
const newImgs = () => ({ hero: im(), drink: im(), pastry: im(), vibe: im() });
const SEED = [
  { id: 1, name: "Hart Bageri", city: "Copenhagen", country: "Denmark", handle: "@WorthTheFika", scene: "Cozy interior", imgs: newImgs(), drink: mk({ type: "Filter Coffee", mod: "Single origin", price: 42, note: "Bright, clean, beautifully balanced.", ratings: { Taste: 5, Clarity: 5, Temperature: 4, Body: 4 } }), pastry: mk({ type: "Cardamom Bun", subtype: "Cardamom", price: 38, note: "Generous spice, just gooey enough.", ratings: { Flavour: 5, Texture: 5, Freshness: 5, Gooeyness: 4 } }), atmosphere: 4, service: 5, value: 4, bestFor: ["Cozy solo", "Queer-friendly", "Hidden gem"], reason: "Worth crossing the city for the bun alone.", take: "The cardamom bun everyone whispers about. Believe them." },
  { id: 2, name: "Prolog Coffee", city: "Copenhagen", country: "Denmark", handle: "@WorthTheFika", scene: "Sunny terrace", imgs: newImgs(), drink: mk({ type: "Flat White", mod: "Oat", price: 48, note: "Silky milk, punchy shot. Reference-grade.", ratings: { Taste: 5, "Milk texture": 5, Temperature: 5, Strength: 4 } }), pastry: mk({ type: "Croissant", subtype: "Pistachio", price: 52, note: "Crisp shatter, rich pistachio centre.", ratings: { Flakiness: 5, Butter: 4, Freshness: 5, Filling: 5 } }), atmosphere: 4, service: 4, value: 4, bestFor: ["Laptop work", "Friends"], reason: "Best oat flat white in the city, full stop.", take: "Come for the flat white, stay for that pistachio croissant." },
  { id: 3, name: "Coffee Collective", city: "Copenhagen", country: "Denmark", handle: "@WorthTheFika", scene: "Nordic minimal", imgs: newImgs(), drink: mk({ type: "Espresso", mod: "Single origin", price: 32, note: "Syrupy, bright, world-class roastery.", ratings: { Taste: 5, Crema: 5, Body: 4, Strength: 5 } }), pastry: mk({ type: "" }), atmosphere: 0, service: 0, value: 4, bestFor: ["Hidden gem", "Cozy solo"], reason: "A coffee-truck-style window — all about the cup.", take: "No seating, no pastry, just possibly the best espresso in town." },
];
const blank = () => ({ id: Date.now(), name: "", city: "", country: "Denmark", handle: "@WorthTheFika", scene: "", imgs: newImgs(), drink: mk({ type: "" }), pastry: mk({ type: "" }), atmosphere: 0, service: 0, value: 0, bestFor: [], reason: "", take: "" });

/* ════ EXPORT HELPERS (offscreen, full-res, no preview screenshotting) ════ */
function loadImgsFor(data) {
  const entries = Object.entries(data?.imgs || {}).filter(([, c]) => c?.src);
  return Promise.all(entries.map(([k, c]) => new Promise((res) => { const im2 = new Image(); im2.onload = () => res([k, im2]); im2.onerror = () => res([k, null]); im2.src = c.src; }))).then((arr) => Object.fromEntries(arr.filter((x) => x[1])));
}
function renderCardOffscreen(data, ctype, fmt, imgMap) {
  const f = FORMATS[fmt]; const cv = document.createElement("canvas"); cv.width = f.w * S; cv.height = f.h * S;
  const ctx = cv.getContext("2d"); ctx.setTransform(S, 0, 0, S, 0, 0);
  const m = { ...data, imgs: {} }; Object.entries(data.imgs || {}).forEach(([k, cfg]) => m.imgs[k] = { ...cfg, img: imgMap[k] });
  if (ctype === "drink") drawDetail(ctx, f.w, f.h, m, fmt, "drink");
  else if (ctype === "pastry") drawDetail(ctx, f.w, f.h, m, fmt, "pastry");
  else if (ctype === "vibe") drawVibe(ctx, f.w, f.h, m, fmt);
  else drawHero(ctx, f.w, f.h, m, fmt);
  return cv;
}
function downloadCanvas(cv, name) { return new Promise((res) => cv.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); URL.revokeObjectURL(a.href); res(); }, "image/png")); }

/* ════ APP ════ */
export default function App() {
  const [reviews, setReviews] = useState(SEED);
  const [tab, setTab] = useState("list");
  const [card, setCard] = useState(null); // {id} | {lb:true}
  const [ctype, setCtype] = useState("hero");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(blank());
  const [handle, setHandle] = useState("@WorthTheFika");
  const [fmt, setFmt] = useState("reel");
  const [toast, setToast] = useState("");
  const [lens, setLens] = useState(null);
  const [q, setQ] = useState(""); const [filt, setFilt] = useState("All");
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState("");
  const [saveSheet, setSaveSheet] = useState(null);
  const [mode, setMode] = useState("public");
  const [gate, setGate] = useState(false);
  const [code, setCode] = useState("");
  const [place, setPlace] = useState(null);
  const fileRef = useRef(); const cardFileRef = useRef(); const canvasRef = useRef();
  useEffect(() => { fetch("/cafes.json").then((r) => r.ok ? r.json() : null).then((d) => { if (Array.isArray(d) && d.length) setReviews(d.map((r) => ({ ...r, imgs: r.imgs || newImgs() }))); }).catch(() => {}); }, []);
  const exportData = () => { const blob = new Blob([JSON.stringify(reviews, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "cafes.json"; a.click(); URL.revokeObjectURL(a.href); flash("cafes.json downloaded — re-upload to publish"); };
  const tryUnlock = () => { if (code.trim() === ADMIN_CODE) { setMode("admin"); setGate(false); setCode(""); flash("Admin unlocked ✦"); } else flash("Wrong code"); };

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 1600); };
  const s = overall(draft); const v = verdictFor(s); const complete = draft.name && s != null;
  const toggleCap = (arr, val, max) => arr.includes(val) ? arr.filter((x) => x !== val) : arr.length < max ? [...arr, val] : (flash(`Max ${max}`), arr);

  const cardData = card && !card.lb ? reviews.find((r) => r.id === card.id) : null;
  const cfg = cardData?.imgs?.[ctype] || im();

  const heroPhoto = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setDraft((d) => ({ ...d, imgs: { ...d.imgs, hero: { ...d.imgs.hero, src: ev.target.result, zoom: 1, fx: 0.5, fy: 0.5 } } })); r.readAsDataURL(f); };
  const saveDraft = () => { const en = { ...draft, handle }; setReviews((rs) => { const i = rs.findIndex((r) => r.id === en.id); if (i >= 0) { const c = [...rs]; c[i] = en; return c; } return [en, ...rs]; }); return en; };
  const openCard = (data) => { setFmt("reel"); setCtype("hero"); setEditing(false); setAi(null); setCard({ id: data.id }); };
  /* single source of truth — every image edit writes to reviews by id (fixes disappearing images) */
  const patchImg = (patch) => setReviews((rs) => rs.map((r) => r.id === card.id ? { ...r, imgs: { ...r.imgs, [ctype]: { ...(r.imgs?.[ctype] || im()), ...patch } } } : r));
  const setCardData = (patch) => setReviews((rs) => rs.map((r) => r.id === card.id ? { ...r, ...patch } : r));
  const cardPhoto = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { patchImg({ src: ev.target.result, zoom: 1, fx: 0.5, fy: 0.5 }); setEditing(true); }; r.readAsDataURL(f); };

  const canvasToItem = (cv, name) => new Promise((res) => cv.toBlob((b) => res({ name, blob: b, url: URL.createObjectURL(b) }), "image/png"));
  const tryShare = async (items) => { try { const files = items.map((it) => new File([it.blob], it.name, { type: "image/png" })); if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: "Fika Reviews" }); return true; } } catch (e) {} return false; };
  const exportPNG = async () => { const cv = canvasRef.current; if (!cv) return; setBusy("Rendering…"); const nm = `${(card.lb ? "fika-ranking" : (cardData.name || "fika") + "-" + ctype).toLowerCase().replace(/\s+/g, "-")}-${FORMATS[fmt].sub}.png`; const item = await canvasToItem(cv, nm); setBusy(""); const shared = await tryShare([item]); if (!shared) setSaveSheet({ items: [item] }); };
  const exportAll = async () => { if (card.lb) return; setBusy("Rendering 4 cards…"); await document.fonts.ready; const imgMap = await loadImgsFor(cardData); const types = ["hero", "drink", "pastry", "vibe"]; const ff = fmt === "overlay" ? "reel" : fmt; const items = []; for (const t of types) { const cv = renderCardOffscreen(cardData, t, ff, imgMap); items.push(await canvasToItem(cv, `${(cardData.name || "fika").toLowerCase().replace(/\s+/g, "-")}-${t}-${FORMATS[ff].sub}.png`)); } setBusy(""); const shared = await tryShare(items); if (!shared) setSaveSheet({ items }); };
  const copyCaption = () => { const d = cardData; const sc = overall(d); const vd = verdictFor(sc); const dd = itemDisplay(d.drink, "drink"), pd = itemDisplay(d.pastry, "pastry"); const cur = curOf(d.country); const out = [`${d.name} — ${sc?.toFixed(1)}/10 ${vd.emoji} ${vd.label}`, `📍 ${d.city}, ${d.country} ${flagOf(d.country)}`, "", d.take || "", "", dd ? `☕ ${dd.name}${dd.paren ? ` (${dd.paren})` : ""} — ${itemScore(d.drink, "drink")?.toFixed(1)} · ${d.drink.price} ${cur}` : "", pd ? `🥐 ${pd.name}${pd.paren ? ` (${pd.paren})` : ""} — ${itemScore(d.pastry, "pastry")?.toFixed(1)} · ${d.pastry.price} ${cur}` : "", "", `#fika #fikascore #${(d.city || "").toLowerCase().replace(/[^a-z]/g, "")} #coffee #cafe`].join("\n").replace(/\n{3,}/g, "\n\n").trim(); navigator.clipboard?.writeText(out); flash("Caption copied ✦"); };

  const aiWrite = async () => { const d = cardData; const sc = overall(d); const vd = verdictFor(sc); const dd = itemDisplay(d.drink, "drink"), pd = itemDisplay(d.pastry, "pastry"); setAi({ loading: true }); try { const ctx = `Café: ${d.name}, ${d.city}, ${d.country}. Fika Score ${sc?.toFixed(1)}/10 (${vd.label}). Drink: ${dd ? dd.name + (dd.paren ? " " + dd.paren : "") + " " + (itemScore(d.drink, "drink") || "") + "/10" : "none"}. Pastry: ${pd ? pd.name + (pd.paren ? " " + pd.paren : "") + " " + (itemScore(d.pastry, "pastry") || "") + "/10" : "none"}. Scene: ${d.scene || "n/a"}. Best for: ${(d.bestFor || []).join(", ")}. Creator's own take: ${d.take || "none"}.`; const txt = await callClaude([{ role: "user", content: `${ctx}\n\nWrite social copy for a cozy, honest, slightly queer-friendly Nordic café-review creator (no face shown). Match that warm, witty, understated voice. Return ONLY JSON: {"sentence":"one punchy line <12 words","take":"editorial creator take, 1 sentence","caption":"IG caption 2-3 lines with 1-2 emoji","hooks":["5 scroll-stopping TikTok hooks"],"subtitle":"3-5 word reel subtitle"}` }], "You are an expert short-form copywriter. Output strictly valid JSON, no markdown, no preamble."); const j = parseJSON(txt); if (!j) throw new Error(); setAi({ write: j }); } catch { setAi({ err: "The AI request was blocked or timed out — the assistant needs a live network connection this preview sandbox may not allow." }); } };
  const aiPhoto = async () => { if (!cfg?.src) return; setAi({ loading: true }); try { const [meta, b64] = cfg.src.split(","); const mt = (meta.match(/data:(.*?);/) || [])[1] || "image/jpeg"; const focus = ctype === "drink" ? "latte art symmetry, foam density, milk texture, roast style, visual extraction" : ctype === "pastry" ? "lamination, flakiness, bake colour, freshness, filling, butter richness" : "lighting, mood, architecture, seating comfort, ambiance"; const txt = await callClaude([{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mt, data: b64 } }, { type: "text", text: `Cautious VISUAL-ONLY notes for a café ${ctype} photo (${focus}). Never claim taste/quality you can't see; always hedge ("appears","looks"). Suggest descriptive language, NOT scores. Return ONLY JSON: {"observations":["2-4 hedged notes"],"tags":["0-3 of: Sunny terrace, Waterfront, Cozy solo, Laptop work, Nordic minimal, Instagrammable"],"sentence":"1 optional suggested line"}` }] }], "You are a careful visual analyst. Describe only what is visible, always hedge, never assert taste or assign scores. Output strictly valid JSON."); const j = parseJSON(txt); if (!j) throw new Error(); setAi({ photo: j }); } catch { setAi({ err: "The AI request was blocked or timed out — photo analysis needs a live network connection this preview sandbox may not allow." }); } };

  const lenses = useMemo(() => { const dt = new Set(), pt = new Set(), bf = new Set(); reviews.forEach((r) => { if (r.drink?.type) dt.add(r.drink.type); if (r.pastry?.type) pt.add(r.pastry.type); (r.bestFor || []).forEach((b) => bf.add(b)); }); const L = [{ key: "atmo", title: "Best Atmosphere", sub: "Ranked by vibe score", kind: "atmo" }]; [...dt].forEach((t) => L.push({ key: "d:" + t, title: `Best ${t}s`, sub: "Ranked by drink score", kind: "drink", t })); [...pt].forEach((t) => L.push({ key: "p:" + t, title: `Top ${t}s`, sub: "Ranked by pastry score", kind: "pastry", t })); [...bf].forEach((b) => L.push({ key: "b:" + b, title: `Best ${b} Cafés`, sub: "Ranked by Fika Score", kind: "bf", t: b })); return L; }, [reviews]);
  const lensList = useMemo(() => { if (!lens) return []; return reviews.map((r) => { if (lens.kind === "drink" && r.drink?.type === lens.t) { const dd = itemDisplay(r.drink, "drink"); return { name: r.name, sub: dd.paren, city: r.city, score: itemScore(r.drink, "drink") }; } if (lens.kind === "pastry" && r.pastry?.type === lens.t) { const pd = itemDisplay(r.pastry, "pastry"); return { name: r.name, sub: pd.paren, city: r.city, score: itemScore(r.pastry, "pastry") }; } if (lens.kind === "bf" && (r.bestFor || []).includes(lens.t)) return { name: r.name, sub: "", city: r.city, score: overall(r) }; if (lens.kind === "atmo") return { name: r.name, sub: r.scene, city: r.city, score: vibeScore(r) }; return null; }).filter((x) => x && x.score != null).sort((a, b) => b.score - a.score); }, [lens, reviews]);
  const shown = useMemo(() => reviews.filter((r) => { const m = (r.name + r.city + r.country).toLowerCase().includes(q.toLowerCase()); const sc = overall(r); const f = filt === "All" || (filt === "≥8.0" && sc >= 8) || (filt === "Worth the trip" && sc >= 8) || (r.bestFor || []).includes(filt); return m && f; }), [reviews, q, filt]);

  /* ── CARD ── */
  if (card) {
    const aspect = 1080 / imgHFor(ctype, fmt);
    const id = SCORE_ID[ctype];
    return (
      <Shell>
        <div style={{ padding: "16px 18px 130px" }}>
          {!editing && <button onClick={() => setCard(null)} style={backBtn}>← Back</button>}
          {!card.lb && !editing && (
            <div style={{ display: "flex", gap: 7, margin: "12px 0 14px" }}>{CARD_TYPES.map(([k, l]) => <button key={k} onClick={() => setCtype(k)} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer", background: ctype === k ? SCORE_ID[k].d : "rgba(255,255,255,0.55)", color: ctype === k ? "#fff" : C.inkSoft, fontFamily: sans, fontWeight: 700, fontSize: 13, boxShadow: ctype === k ? "0 3px 10px rgba(40,24,10,.2)" : "inset 0 0 0 1px " + C.line }}>{l}</button>)}</div>
          )}
          {editing ? (
            <div style={{ margin: "8px auto 14px", maxWidth: 344 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: sans, fontWeight: 800, fontSize: 12, letterSpacing: 1, color: C.clay }}>EDITING {ctype.toUpperCase()} PHOTO</span>
                <button onClick={() => setEditing(false)} style={{ ...miniBtn, background: C.clay, padding: "8px 16px" }}>Apply Crop</button>
              </div>
              <CropView cfg={cfg} aspect={aspect} onChange={patchImg} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px" }}><span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.inkSoft }}>Zoom</span><input type="range" min={100} max={400} value={Math.round((cfg?.zoom || 1) * 100)} onChange={(e) => patchImg({ zoom: +e.target.value / 100 })} style={{ flex: 1, accentColor: C.clay }} /></div>
              <button onClick={() => patchImg({ zoom: 1, fx: 0.5, fy: 0.5 })} style={{ ...ghostBtn, marginBottom: 10 }}>↺ Reset</button>
              <button onClick={() => setEditing(false)} style={ctaBtn}>✓ Apply Crop</button>
            </div>
          ) : (
            <div style={{ margin: "0 auto 14px", maxWidth: 344 }}><CardCanvas data={card.lb ? null : cardData} list={lensList} handle={handle} title={card.lb ? lens.title : ""} sub={card.lb ? lens.sub : ""} kind={card.lb ? "leaderboard" : "review"} ctype={ctype} fmt={card.lb ? "reel" : fmt} onReady={(cv) => (canvasRef.current = cv)} /></div>
          )}

          {!card.lb && !editing && (
            <>
              {mode === "admin" && (<>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => cfg?.src ? setEditing(true) : cardFileRef.current.click()} style={{ ...ghostBtn, flex: 1, padding: "12px" }}>{cfg?.src ? "✂️ Crop / reposition" : "🖼 Add " + ctype + " photo"}</button>
                <button onClick={() => cardFileRef.current.click()} style={{ ...ghostBtn, width: 116, padding: "12px" }}>{cfg?.src ? "Replace" : "Browse"}</button>
                <input ref={cardFileRef} type="file" accept="image/*" hidden onChange={cardPhoto} />
              </div>
              {/* non-blocking AI chip */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <button onClick={() => setAi({})} style={{ border: "none", cursor: "pointer", borderRadius: 22, padding: "8px 16px", fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.goldDeep, background: "linear-gradient(135deg,#FBF0DA,#F3E2C4)", boxShadow: "inset 0 0 0 1px " + C.gold }}>✨ {cfg?.src ? "Optimization available" : "AI assist (optional)"}</button>
              </div>
              </>)}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginBottom: 16 }}>{Object.entries(FORMATS).map(([k, f]) => <button key={k} onClick={() => setFmt(k)} style={{ padding: "10px 4px", borderRadius: 12, border: "none", cursor: "pointer", background: fmt === k ? C.ink : "rgba(255,255,255,0.55)", color: fmt === k ? C.cream : C.inkSoft, fontFamily: sans, fontWeight: 700, fontSize: 12, boxShadow: fmt === k ? "none" : "inset 0 0 0 1px " + C.line }}>{f.label}<div style={{ fontSize: 10, opacity: 0.6 }}>{f.sub}</div></button>)}</div>
            </>
          )}
          {!editing && <button onClick={exportPNG} style={ctaBtn}>⬇  Save {ctype !== "hero" && !card.lb ? ctype + " " : ""}card to Photos · 4K</button>}
          {mode === "admin" && !card.lb && !editing && <button onClick={exportAll} style={{ ...ghostBtn, marginTop: 10 }}>⬇⬇  Export all 4 cards to Photos</button>}
          {!card.lb && !editing && <button onClick={copyCaption} style={{ ...ghostBtn, marginTop: 10 }}>📋  Copy caption + hashtags</button>}
          {!card.lb && !editing && cardData && <InfoPanel d={cardData} place={place} setPlace={setPlace} />}
          {busy && <Toast>{busy}</Toast>}
          {saveSheet && (
            <div onClick={() => setSaveSheet(null)} style={{ position: "fixed", inset: 0, background: "rgba(20,12,6,0.55)", zIndex: 350, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: C.cream, borderRadius: "24px 24px 0 0", padding: "20px 18px 30px", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 -10px 40px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><h3 style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: C.ink, margin: 0 }}>Save to Photos</h3><button onClick={() => setSaveSheet(null)} style={{ border: "none", background: "none", fontSize: 22, color: C.inkSoft, cursor: "pointer" }}>×</button></div>
                <p style={{ fontFamily: sans, fontSize: 12.5, color: C.inkSoft, margin: "0 0 14px" }}>On iPhone: <b>press &amp; hold</b> an image → <b>“Save to Photos”</b>. Or tap <b>Share</b> and choose Save Image. (A sandboxed web app can’t write to your gallery directly — this is the reliable way.)</p>
                {navigator.canShare && <button onClick={() => tryShare(saveSheet.items)} style={{ ...ctaBtn, marginBottom: 14 }}>⤴  Share / Save {saveSheet.items.length > 1 ? `all ${saveSheet.items.length}` : ""}</button>}
                {saveSheet.items.map((it) => (
                  <div key={it.name} style={{ marginBottom: 16 }}>
                    <img src={it.url} alt={it.name} style={{ width: "100%", borderRadius: 14, display: "block", boxShadow: "0 8px 24px rgba(40,24,10,0.25)" }} />
                    <a href={it.url} download={it.name} style={{ ...ghostBtn, display: "block", textAlign: "center", textDecoration: "none", marginTop: 8 }}>⬇ Download PNG</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {ai && (
          <div onClick={() => setAi(null)} style={{ position: "fixed", inset: 0, background: "rgba(20,12,6,0.45)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: C.cream, borderRadius: "24px 24px 0 0", padding: "20px 18px 30px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 -10px 40px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><h3 style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: C.ink, margin: 0 }}>✨ AI Fika Assistant</h3><button onClick={() => setAi(null)} style={{ border: "none", background: "none", fontSize: 22, color: C.inkSoft, cursor: "pointer" }}>×</button></div>
              <p style={{ fontFamily: sans, fontSize: 12, color: C.inkSoft, margin: "0 0 14px" }}>Suggestions only — you keep full control of scores and words.</p>
              {!ai.loading && !ai.write && !ai.photo && !ai.err && (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><button onClick={aiWrite} style={ctaBtn}>📝 Write content (sentence, take, caption, hooks)</button><button onClick={aiPhoto} disabled={!cfg?.src} style={{ ...ghostBtn, opacity: cfg?.src ? 1 : 0.4 }}>🔍 Analyze the {ctype} photo {cfg?.src ? "" : "(add a photo first)"}</button></div>)}
              {ai.loading && <p style={{ fontFamily: sans, color: C.inkSoft, textAlign: "center", padding: "30px 0" }}>Thinking…</p>}
              {ai.err && <div><p style={{ fontFamily: sans, color: C.red, fontSize: 14 }}>{ai.err}</p><button onClick={() => setAi({})} style={ghostBtn}>← Back</button></div>}
              {ai.write && (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}><AiRow label="Punchy sentence" value={ai.write.sentence} onApply={() => { setCardData({ take: ai.write.sentence }); flash("Applied ✦"); }} applyLabel="Use as take" /><AiRow label="Creator take" value={ai.write.take} onApply={() => { setCardData({ take: ai.write.take }); flash("Applied ✦"); }} applyLabel="Use as take" /><AiRow label="Caption" value={ai.write.caption} onApply={() => { navigator.clipboard?.writeText(ai.write.caption); flash("Copied ✦"); }} applyLabel="Copy" />{Array.isArray(ai.write.hooks) && ai.write.hooks.length > 0 && <div style={aiCard}><div style={aiLbl}>5 viral hooks</div>{ai.write.hooks.map((h, i) => <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}><span style={{ fontFamily: serif, fontSize: 15, color: C.ink, flex: 1 }}>{h}</span><button onClick={() => { navigator.clipboard?.writeText(h); flash("Copied ✦"); }} style={miniBtn}>copy</button></div>)}</div>}<AiRow label="Reel subtitle" value={ai.write.subtitle} onApply={() => { navigator.clipboard?.writeText(ai.write.subtitle); flash("Copied ✦"); }} applyLabel="Copy" /><button onClick={() => setAi({})} style={{ ...ghostBtn, marginTop: 4 }}>← Back</button></div>)}
              {ai.photo && (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}><div style={aiCard}><div style={aiLbl}>Visual observations</div>{(ai.photo.observations || []).map((o, i) => <div key={i} style={{ fontFamily: serif, fontSize: 15, color: C.ink, marginTop: 6 }}>• {o}</div>)}</div>{Array.isArray(ai.photo.tags) && ai.photo.tags.length > 0 && <div style={aiCard}><div style={aiLbl}>Suggested tags</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{ai.photo.tags.map((t) => { const isScene = SCENES.some((sc) => sc[0] === t), isBf = BESTFOR.some((b) => b[0] === t); return <button key={t} onClick={() => { if (isScene) setCardData({ scene: t }); else if (isBf) setCardData({ bestFor: (cardData.bestFor || []).includes(t) ? cardData.bestFor : [...(cardData.bestFor || []), t].slice(0, 3) }); flash("Added ✦"); }} style={{ ...miniBtn, padding: "7px 12px" }}>+ {t}</button>; })}</div></div>}{ai.photo.sentence && <AiRow label="Suggested line" value={ai.photo.sentence} onApply={() => { setCardData({ take: ai.photo.sentence }); flash("Applied ✦"); }} applyLabel="Use as take" />}<p style={{ fontFamily: sans, fontSize: 11, color: C.inkSoft, margin: 0 }}>Visual cues only — taste and quality can't be judged from a photo.</p><button onClick={() => setAi({})} style={{ ...ghostBtn, marginTop: 4 }}>← Back</button></div>)}
            </div>
          </div>
        )}
        {toast && <Toast>{toast}</Toast>}
      </Shell>
    );
  }

  /* ── EDITOR ── */
  if (tab === "edit" && mode === "admin") {
    return (
      <Shell>
        <Header title="New Review" sub="≈30 seconds · skip what you didn't try" />
        <div style={{ padding: "0 18px 130px" }}>
          <div onClick={() => fileRef.current.click()} style={{ height: draft.imgs.hero.src ? 190 : 120, borderRadius: 18, overflow: "hidden", cursor: "pointer", border: draft.imgs.hero.src ? "none" : `2px dashed ${C.clay}55`, background: draft.imgs.hero.src ? "none" : "rgba(188,91,53,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{draft.imgs.hero.src ? <img src={draft.imgs.hero.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", color: C.clay }}><div style={{ fontSize: 28 }}>📷</div><div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600 }}>Add café photo</div></div>}</div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={heroPhoto} />
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Café name" style={{ ...inputS, width: "100%", fontFamily: serif, fontSize: 20, marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="City" style={{ ...inputS, flex: 1 }} /><select value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} style={{ ...inputS, fontWeight: 700, cursor: "pointer" }}>{COUNTRIES.map(([c, f]) => <option key={c} value={c}>{f} {c}</option>)}</select></div>
          <button onClick={() => setDraft({ ...draft, city: "Copenhagen", country: "Denmark" })} style={{ ...ghostBtn, padding: "10px", fontSize: 13, marginBottom: 18 }}>📍 Use Copenhagen, Denmark 🇩🇰</button>
          <ItemSection cat="drink" item={draft.drink} onChange={(it) => setDraft({ ...draft, drink: it })} />
          <ItemSection cat="pastry" item={draft.pastry} onChange={(it) => setDraft({ ...draft, pastry: it })} />
          <div style={{ background: "rgba(255,255,255,0.5)", borderRadius: 18, padding: "6px 16px", marginBottom: 8 }}>{[["atmosphere", "✨ Atmosphere"], ["service", "🤍 Service"], ["value", "💰 Value for money"]].map(([k, l], i) => <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: i < 2 ? `1px solid ${C.line}` : "none" }}><span style={{ fontFamily: sans, fontWeight: 600, fontSize: 15, color: C.ink }}>{l}</span><Cups value={draft[k]} onChange={(n) => setDraft({ ...draft, [k]: n })} /></div>)}</div>
          <p style={{ fontFamily: sans, fontSize: 11.5, color: C.inkSoft, margin: "0 0 16px", textAlign: "center" }}>Tap a cup again to clear it — skipped categories won't affect the score.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "14px 18px", borderRadius: 18, background: C.ink }}><div style={{ textAlign: "center" }}><div style={{ fontFamily: serif, fontWeight: 700, fontSize: 42, color: C.gold, lineHeight: 1 }}>{s != null ? s.toFixed(1) : "–"}</div><div style={{ fontFamily: sans, fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 800, letterSpacing: 1 }}>FIKA SCORE™</div></div><div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 16 }}><div style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: 1 }}>VERDICT</div><div style={{ fontFamily: sans, fontWeight: 800, fontSize: 17, color: C.cream }}>{v.emoji} {v.label}</div></div></div>
          <Label>Scene <span style={{ color: C.inkSoft, fontWeight: 600, textTransform: "none" }}>· over photo</span></Label>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 16 }}>{SCENES.map(([sc, e]) => <Chip key={sc} active={draft.scene === sc} onClick={() => setDraft({ ...draft, scene: draft.scene === sc ? "" : sc })}>{e} {sc}</Chip>)}</div>
          <Label>Best for <span style={{ color: C.inkSoft, fontWeight: 600, textTransform: "none" }}>· max 3</span></Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{BESTFOR.map(([b, e]) => { const on = draft.bestFor.includes(b); return <Chip key={b} queer={b === "Queer-friendly"} active={on} dim={!on && draft.bestFor.length >= 3} onClick={() => setDraft({ ...draft, bestFor: toggleCap(draft.bestFor, b, 3) })}>{e} {b}</Chip>; })}</div>
          <Label>Verdict reason <span style={{ color: C.inkSoft, fontWeight: 600, textTransform: "none" }}>· tiny</span></Label>
          <input value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Beautiful terrace, average pastry" style={{ ...inputS, width: "100%", marginBottom: 14 }} />
          <Label>Creator take <span style={{ color: C.inkSoft, fontWeight: 600, textTransform: "none" }}>· your voice</span></Label>
          <textarea value={draft.take} onChange={(e) => setDraft({ ...draft, take: e.target.value })} rows={2} placeholder="Come for the terrace, not the croissant." style={{ ...inputS, width: "100%", fontFamily: serif, fontStyle: "italic", fontSize: 17, resize: "none", marginBottom: 20 }} />
          <button disabled={!complete} onClick={() => { const e = saveDraft(); openCard(e); }} style={{ ...ctaBtn, opacity: complete ? 1 : 0.4, cursor: complete ? "pointer" : "not-allowed" }}>See cards  →</button>
          {!complete && <p style={{ textAlign: "center", fontFamily: sans, fontSize: 12, color: C.inkSoft, marginTop: 8 }}>Add a name + rate at least one item</p>}
        </div>
        <Nav tab={tab} setTab={setTab} admin={mode === "admin"} onNew={() => { setDraft(blank()); setTab("edit"); }} />
        {toast && <Toast>{toast}</Toast>}
      </Shell>
    );
  }

  /* ── COLLECTIONS ── */
  if (tab === "rank") {
    return (<Shell><Header title="Collections" sub="Your database, auto-ranked" /><div style={{ padding: "0 18px 130px" }}><div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>{lenses.map((l) => <Chip key={l.key} active={lens?.key === l.key} onClick={() => setLens(l)}>{l.title}</Chip>)}</div>{!lens && <p style={{ fontFamily: sans, color: C.inkSoft, fontSize: 14 }}>Pick a collection — e.g. <b>Best Flat Whites</b>, <b>Top Cardamom Buns</b>, <b>Best Queer-friendly Cafés</b>.</p>}{lens && <><button onClick={() => { setEditing(false); setAi(null); setCard({ lb: true }); }} style={{ ...ctaBtn, marginBottom: 16 }}>✦  Generate “{lens.title}” card</button>{lensList.map((r, i) => <div key={i} style={rowCard}><div style={{ fontFamily: serif, fontWeight: 700, fontSize: 28, color: i === 0 ? C.gold : C.inkSoft, width: 32, textAlign: "center" }}>{i + 1}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: serif, fontWeight: 700, fontSize: 17, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div><div style={{ fontFamily: sans, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{[r.sub, r.city].filter(Boolean).join(" · ")}</div></div><div style={{ fontFamily: serif, fontWeight: 700, fontSize: 24, color: C.clay }}>{r.score?.toFixed(1)}</div></div>)}</>}</div><Nav tab={tab} setTab={setTab} admin={mode === "admin"} onNew={() => { setDraft(blank()); setTab("edit"); }} />{toast && <Toast>{toast}</Toast>}</Shell>);
  }

  /* ── HOME ── */
  return (
    <Shell>
      <div style={{ padding: "26px 18px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><div style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, letterSpacing: 2, color: C.clay }}>☕ FIKA REVIEWS</div><h1 style={{ fontFamily: serif, fontWeight: 700, fontSize: 32, color: C.ink, margin: "2px 0 0" }}>{mode === "admin" ? "Your cafés" : "Café guide"}</h1><div style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.inkSoft, marginTop: 2 }}>☕ {reviews.length} cafés reviewed · Trusted Fika Curator</div></div><input value={handle} onChange={(e) => setHandle(e.target.value)} style={{ ...inputS, width: 110, fontSize: 13, textAlign: "right", padding: "8px 10px" }} /></div>
      <div style={{ padding: "8px 18px 0", display: "flex", gap: 8, alignItems: "center" }}>
        {mode === "admin" ? (<>
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: C.green, background: "rgba(94,123,82,0.14)", padding: "5px 10px", borderRadius: 20 }}>● ADMIN</span>
          <button onClick={exportData} style={{ ...ghostBtn, padding: "7px 12px", width: "auto", fontSize: 12 }}>⬇ Export data</button>
          <button onClick={() => setMode("public")} style={{ ...ghostBtn, padding: "7px 12px", width: "auto", fontSize: 12 }}>Exit admin</button>
        </>) : (
          <button onClick={() => setGate(true)} style={{ ...ghostBtn, padding: "7px 12px", width: "auto", fontSize: 12, color: C.inkSoft }}>🔒 Admin</button>
        )}
      </div>
      {gate && (
        <div onClick={() => setGate(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,12,6,0.5)", zIndex: 360, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, background: C.cream, borderRadius: 20, padding: 22, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontFamily: serif, fontWeight: 700, fontSize: 20, color: C.ink, margin: "0 0 4px" }}>Admin access</h3>
            <p style={{ fontFamily: sans, fontSize: 12, color: C.inkSoft, margin: "0 0 14px" }}>Enter your code to add or edit cafés. Public visitors stay read-only.</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} type="password" placeholder="Admin code" onKeyDown={(e) => e.key === "Enter" && tryUnlock()} style={{ ...inputS, width: "100%", marginBottom: 12 }} />
            <button onClick={tryUnlock} style={ctaBtn}>Unlock</button>
          </div>
        </div>
      )}
      <div style={{ padding: "10px 18px 0" }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search cafés, cities…" style={{ ...inputS, width: "100%", marginBottom: 10 }} /><div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>{["All", "≥8.0", "Hidden gem", "Queer-friendly", "Laptop work", "Worth the trip"].map((f) => <Chip key={f} active={filt === f} onClick={() => setFilt(f)}>{f}</Chip>)}</div></div>
      <div style={{ padding: "8px 18px 130px" }}>{shown.map((r) => { const sc = overall(r); const vd = verdictFor(sc); const dd = itemDisplay(r.drink, "drink"), pd = itemDisplay(r.pastry, "pastry"); const cur = curOf(r.country); return (
        <div key={r.id} onClick={() => openCard(r)} style={{ borderRadius: 22, overflow: "hidden", marginBottom: 16, cursor: "pointer", background: C.cream, boxShadow: "0 10px 28px rgba(40,24,10,0.12)" }}>
          <div style={{ height: 132, position: "relative", background: "linear-gradient(135deg,#CBA079,#6F4A30)" }}>{r.imgs?.hero?.src && <img src={r.imgs.hero.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}<div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,0.28),transparent 45%)" }} /><div style={{ position: "absolute", left: 12, top: 12, display: "flex", gap: 6 }}><span style={{ background: vd.color, color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 11, padding: "5px 11px", borderRadius: 20 }}>{vd.emoji} {vd.label}</span>{r.scene && <span style={{ background: "rgba(15,9,4,0.5)", color: "#fff", fontFamily: sans, fontWeight: 700, fontSize: 11, padding: "5px 11px", borderRadius: 20 }}>{sceneEmoji(r.scene)} {r.scene}</span>}</div><div style={{ position: "absolute", right: 14, bottom: -24, width: 60, height: 60, borderRadius: "50%", background: C.creamHi, border: `2px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(40,24,10,0.25)" }}><span style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: C.ink }}>{sc?.toFixed(1)}</span></div></div>
          <div style={{ padding: "16px" }}><div style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: C.ink, lineHeight: 1.1 }}>{r.name}</div><div style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.inkSoft, marginBottom: 10 }}>📍 {r.city}, {r.country} {flagOf(r.country)}</div><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{dd && <ItemLine emoji="☕" name={dd.name} paren={dd.paren} score={itemScore(r.drink, "drink")} price={r.drink.price} cur={cur} />}{pd && <ItemLine emoji="🥐" name={pd.name} paren={pd.paren} score={itemScore(r.pastry, "pastry")} price={r.pastry.price} cur={cur} />}</div>{r.take && <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: C.clay, marginTop: 10 }}>“{r.take}”</div>}</div>
        </div>); })}{!shown.length && <p style={{ fontFamily: sans, color: C.inkSoft, textAlign: "center", marginTop: 30 }}>No cafés match that filter.</p>}</div>
      <Nav tab={tab} setTab={setTab} admin={mode === "admin"} onNew={() => { setDraft(blank()); setTab("edit"); }} />
      {toast && <Toast>{toast}</Toast>}
    </Shell>
  );
}

function AiRow({ label, value, onApply, applyLabel }) { if (!value) return null; return <div style={aiCard}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={aiLbl}>{label}</div><button onClick={onApply} style={miniBtn}>{applyLabel}</button></div><div style={{ fontFamily: serif, fontSize: 16, color: C.ink, marginTop: 6, fontStyle: label === "Caption" ? "normal" : "italic" }}>{value}</div></div>; }
function InfoPanel({ d, place, setPlace }) {
  useEffect(() => { let on = true; setPlace(null); const q = [d.name, d.city, d.country].filter(Boolean).join(" "); fetch(PLACES_ENDPOINT + "?q=" + encodeURIComponent(q)).then((r) => r.ok ? r.json() : null).then((j) => { if (on) setPlace(j || { configured: false }); }).catch(() => { if (on) setPlace({ configured: false }); }); return () => { on = false; }; }, [d.id]);
  return (
    <div style={{ marginTop: 18, background: "rgba(255,255,255,0.55)", borderRadius: 18, padding: 16, boxShadow: "inset 0 0 0 1px " + C.line }}>
      <div style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.clay, marginBottom: 8 }}>📍 LOCATION</div>
      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.ink }}>{d.name}</div>
      <div style={{ fontFamily: sans, fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>{[d.city, d.country].filter(Boolean).join(", ")} {flagOf(d.country)}</div>
      <a href={mapsUrl(d)} target="_blank" rel="noreferrer" style={{ ...ghostBtn, display: "block", textAlign: "center", textDecoration: "none", marginBottom: 16 }}>🗺  Open in Google Maps</a>
      <div style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.clay, margin: "4px 0 8px" }}>💬 HOW OTHERS REVIEW IT</div>
      {!place && <div style={{ fontFamily: sans, fontSize: 13, color: C.inkSoft }}>Loading…</div>}
      {place && place.configured && place.found && (<>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}><span style={{ fontFamily: serif, fontWeight: 700, fontSize: 30, color: C.gold }}>{place.rating != null ? place.rating.toFixed(1) : "–"}</span><span style={{ fontFamily: sans, fontSize: 13, color: C.inkSoft }}>on Google · {place.total} reviews</span></div>
        {(place.reviews || []).map((rv, i) => (<div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < place.reviews.length - 1 ? "1px solid " + C.line : "none" }}><div style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, color: C.ink }}>{"★".repeat(Math.round(rv.rating || 0))} <span style={{ color: C.inkSoft, fontWeight: 600 }}>{rv.author} · {rv.time}</span></div><div style={{ fontFamily: serif, fontSize: 14, color: C.ink, marginTop: 3, lineHeight: 1.4 }}>{rv.text}</div></div>))}
        <div style={{ fontFamily: sans, fontSize: 11, color: C.inkSoft }}>Ratings &amp; reviews via Google</div>
      </>)}
      {place && (!place.configured || !place.found) && (<div><p style={{ fontFamily: sans, fontSize: 13, color: C.inkSoft, margin: "0 0 10px" }}>{place.configured ? "No Google match for this café yet." : "Live Google ratings aren’t connected yet."} See everyone’s reviews on Google:</p><a href={mapsUrl(d)} target="_blank" rel="noreferrer" style={{ ...ghostBtn, display: "block", textAlign: "center", textDecoration: "none" }}>⭐  See Google reviews</a></div>)}
    </div>
  );
}
function ItemLine({ emoji, name, paren, score, price, cur }) { return <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><span style={{ fontFamily: sans, fontSize: 14, color: C.ink }}>{emoji} <b>{name}</b>{paren ? <span style={{ color: C.inkSoft }}> ({paren})</span> : null}</span><span style={{ fontFamily: sans, fontSize: 13, color: C.inkSoft }}>{price ? `${price} ${cur} · ` : ""}<span style={{ fontFamily: serif, fontWeight: 700, fontSize: 16, color: C.clay }}>{score?.toFixed(1) ?? "–"}</span></span></div>; }

/* ════ LAYOUT ════ */
function Shell({ children }) { return (<div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at 50% 0%, ${C.paper} 0%, ${C.paper2} 100%)` }}><div style={{ maxWidth: 440, margin: "0 auto", position: "relative", minHeight: "100vh" }}>{children}</div><style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Hanken+Grotesk:wght@500;600;700;800&display=swap');* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }::-webkit-scrollbar { display: none; }input::placeholder, textarea::placeholder { color: ${C.inkSoft}88; }input:focus, textarea:focus, select:focus { outline: none; box-shadow: inset 0 0 0 2px ${C.clay}88 !important; }`}</style></div>); }
const Header = ({ title, sub }) => <div style={{ padding: "26px 18px 14px" }}><h1 style={{ fontFamily: serif, fontWeight: 700, fontSize: 30, color: C.ink, margin: 0 }}>{title}</h1><p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.inkSoft, margin: "3px 0 0" }}>{sub}</p></div>;
const Label = ({ children }) => <div style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.inkSoft, marginBottom: 8, textTransform: "uppercase" }}>{children}</div>;
const Toast = ({ children }) => <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 400, background: C.ink, color: C.cream, fontFamily: sans, fontWeight: 700, fontSize: 14, padding: "12px 22px", borderRadius: 30, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>{children}</div>;
function Nav({ tab, setTab, onNew, admin }) { return (<div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 440, background: "rgba(251,245,234,0.92)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 0 18px", zIndex: 50 }}><NavBtn active={tab === "list"} onClick={() => setTab("list")} emoji="🏠" label="Cafés" />{admin ? <button onClick={onNew} style={{ width: 58, height: 58, borderRadius: "50%", border: "none", cursor: "pointer", marginTop: -22, background: `linear-gradient(135deg,${C.clay},${C.clayDeep})`, color: "#fff", fontSize: 28, boxShadow: "0 8px 22px rgba(188,91,53,0.45)" }}>＋</button> : <div style={{ width: 58 }} />}<NavBtn active={tab === "rank"} onClick={() => setTab("rank")} emoji="🏆" label="Collections" /></div>); }
const NavBtn = ({ active, onClick, emoji, label }) => <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", opacity: active ? 1 : 0.45 }}><div style={{ fontSize: 22 }}>{emoji}</div><div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, color: C.ink }}>{label}</div></button>;
const inputS = { background: "rgba(255,255,255,0.6)", border: "none", borderRadius: 12, padding: "11px 14px", fontFamily: sans, fontSize: 15, color: C.ink, boxShadow: "inset 0 0 0 1px " + C.line };
const ctaBtn = { width: "100%", padding: "16px", border: "none", borderRadius: 16, cursor: "pointer", fontFamily: serif, fontWeight: 700, fontSize: 17, color: "#fff", background: `linear-gradient(135deg,${C.clay},${C.clayDeep})`, boxShadow: "0 10px 26px rgba(188,91,53,0.4)" };
const ghostBtn = { width: "100%", padding: "15px", border: "none", borderRadius: 16, cursor: "pointer", fontFamily: sans, fontWeight: 700, fontSize: 15, color: C.ink, background: "rgba(255,255,255,0.6)", boxShadow: "inset 0 0 0 1px " + C.line };
const backBtn = { background: "rgba(255,255,255,0.6)", border: "none", borderRadius: 12, padding: "10px 16px", fontFamily: sans, fontWeight: 700, fontSize: 14, color: C.ink, cursor: "pointer", boxShadow: "inset 0 0 0 1px " + C.line };
const rowCard = { display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 16, marginBottom: 10, background: C.cream, boxShadow: "0 4px 16px rgba(40,24,10,0.08)" };
const aiCard = { background: "rgba(255,255,255,0.6)", borderRadius: 14, padding: "12px 14px", boxShadow: "inset 0 0 0 1px " + C.line };
const aiLbl = { fontFamily: sans, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: C.clay, textTransform: "uppercase" };
const miniBtn = { border: "none", background: C.ink, color: C.cream, fontFamily: sans, fontWeight: 700, fontSize: 12, padding: "6px 12px", borderRadius: 10, cursor: "pointer" };
