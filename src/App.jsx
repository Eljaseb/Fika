import React, { useEffect, useMemo, useState } from "react";

const CAFE_API = "/api/cafes";
const SAVED_KEY = "wtfika:saved";
const NAME_KEY = "wtfika:name";

const MOODS = [
  { id: "all", label: "All picks" },
  { id: "coffee", label: "Coffee first" },
  { id: "pastry", label: "Pastry mission" },
  { id: "Cozy solo", label: "Cozy solo" },
  { id: "Laptop work", label: "Laptop work" },
  { id: "Friends", label: "With friends" },
  { id: "Queer-friendly", label: "Queer-friendly" },
  { id: "Hidden gem", label: "Hidden gems" },
];

function clamp(n, min = 0, max = 5) {
  const value = Number(n);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 0;
}

function average(values) {
  const nums = values.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function categoryAverage(category) {
  return average(Object.values(category?.ratings || {}));
}

function cafeScore(cafe) {
  const drink = categoryAverage(cafe.drink);
  const pastry = categoryAverage(cafe.pastry);
  const supporting = average([cafe.atmosphere, cafe.service, cafe.value]);
  const hero = average([drink, pastry].filter(Boolean));
  const blended = hero && supporting ? hero * 0.72 + supporting * 0.28 : hero || supporting || 0;
  return blended ? Math.round(blended * 20) : 0;
}

function currencyFor(cafe) {
  return cafe?.country === "Denmark" ? "DKK" : cafe?.country === "Sweden" ? "SEK" : "EUR";
}

function money(amount, cafe) {
  const n = Number(amount);
  if (!n) return "";
  return new Intl.NumberFormat("en", { style: "currency", currency: currencyFor(cafe), maximumFractionDigits: 0 }).format(n);
}

function initials(name = "Fika") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function mapsUrl(cafe) {
  const q = [cafe?.name, cafe?.city, cafe?.country].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function Heart({ filled = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.25s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.85c0 5.6-7.5 10.2-7.5 10.2Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

function Pin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.2" fill="currentColor" /></svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  );
}

function FikaMark() {
  return (
    <div className="brand-mark" aria-hidden="true"><span>F</span><i /></div>
  );
}

function RatingBar({ label, value }) {
  const v = clamp(value);
  return (
    <div className="rating-line">
      <span>{label}</span>
      <div className="rating-track"><i style={{ width: `${v * 20}%` }} /></div>
      <strong>{v ? v.toFixed(1) : "–"}</strong>
    </div>
  );
}

function CafeArt({ cafe, compact = false }) {
  const image = Array.isArray(cafe?.imgs) ? cafe.imgs.find(Boolean) : typeof cafe?.imgs === "string" ? cafe.imgs : null;
  return (
    <div className={`cafe-art ${compact ? "compact" : ""}`}>
      {image ? <img src={image} alt={`${cafe.name} café`} loading="lazy" /> : (
        <>
          <div className="art-orb orb-one" />
          <div className="art-orb orb-two" />
          <span className="art-initials">{initials(cafe?.name)}</span>
          <span className="art-caption">{cafe?.scene || "Worth the fika"}</span>
        </>
      )}
    </div>
  );
}

function ScorePill({ cafe }) {
  const score = cafeScore(cafe);
  return <div className="score-pill"><strong>{score || "–"}</strong><span>/100</span></div>;
}

function CafeCard({ cafe, rank, saved, onSave, onOpen }) {
  const drink = cafe.drink?.type;
  const pastry = cafe.pastry?.type;
  return (
    <article className="cafe-card">
      <button className="card-hit" onClick={() => onOpen(cafe)} aria-label={`Open ${cafe.name}`} />
      <CafeArt cafe={cafe} />
      <div className="card-content">
        <div className="card-topline">
          <span className="rank">#{rank}</span>
          <button className={`save-btn ${saved ? "saved" : ""}`} onClick={(e) => { e.stopPropagation(); onSave(cafe.id); }} aria-label={saved ? "Remove from saved" : "Save café"}><Heart filled={saved} /></button>
        </div>
        <div className="card-title-row">
          <div>
            <h3>{cafe.name}</h3>
            <p className="location"><Pin /> {cafe.city}</p>
          </div>
          <ScorePill cafe={cafe} />
        </div>
        <p className="take">{cafe.take || cafe.reason || "A café worth remembering."}</p>
        <div className="taste-row">
          {drink && <span><b>{drink}</b>{cafe.drink?.price ? ` · ${money(cafe.drink.price, cafe)}` : ""}</span>}
          {pastry && <span><b>{pastry}</b>{cafe.pastry?.price ? ` · ${money(cafe.pastry.price, cafe)}` : ""}</span>}
        </div>
        <div className="tag-row">
          {(cafe.bestFor || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <button className="text-link" onClick={() => onOpen(cafe)}>See the full fika <Arrow /></button>
      </div>
    </article>
  );
}

function CafeModal({ cafe, saved, onSave, onClose }) {
  if (!cafe) return null;
  const drinkRatings = Object.entries(cafe.drink?.ratings || {});
  const pastryRatings = Object.entries(cafe.pastry?.ratings || {});
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-modal" role="dialog" aria-modal="true" aria-label={`${cafe.name} review`} onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <CafeArt cafe={cafe} compact />
        <div className="detail-body">
          <div className="detail-heading">
            <div><p className="eyebrow">{cafe.scene || "Curated pick"}</p><h2>{cafe.name}</h2><p className="location"><Pin /> {cafe.city}, {cafe.country}</p></div>
            <ScorePill cafe={cafe} />
          </div>
          <p className="detail-take">{cafe.take || cafe.reason}</p>
          {cafe.reason && <blockquote>“{cafe.reason}”</blockquote>}

          <div className="detail-grid">
            {cafe.drink?.type && <div className="detail-panel"><p className="eyebrow">Drink</p><h3>{cafe.drink.type}</h3><p>{[cafe.drink.mod, cafe.drink.subtype].filter(Boolean).join(" · ")}</p><p className="panel-note">{cafe.drink.note}</p>{drinkRatings.map(([label, value]) => <RatingBar key={label} label={label} value={value} />)}</div>}
            {cafe.pastry?.type && <div className="detail-panel"><p className="eyebrow">Pastry</p><h3>{cafe.pastry.type}</h3><p>{[cafe.pastry.subtype, cafe.pastry.mod].filter(Boolean).join(" · ")}</p><p className="panel-note">{cafe.pastry.note}</p>{pastryRatings.map(([label, value]) => <RatingBar key={label} label={label} value={value} />)}</div>}
          </div>

          <div className="detail-panel compact-panel">
            <p className="eyebrow">The room</p>
            <RatingBar label="Atmosphere" value={cafe.atmosphere} />
            <RatingBar label="Service" value={cafe.service} />
            <RatingBar label="Value" value={cafe.value} />
          </div>

          <div className="tag-row large">{(cafe.bestFor || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="modal-actions">
            <a className="primary-btn" href={mapsUrl(cafe)} target="_blank" rel="noreferrer">Open in Maps <Arrow /></a>
            <button className="secondary-btn" onClick={() => onSave(cafe.id)}><Heart filled={saved} /> {saved ? "Saved" : "Save this fika"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ mode, onReset }) {
  return (
    <div className="empty-state">
      <span>☕</span>
      <h3>{mode === "saved" ? "Your fika list is waiting" : "No café matches that mood yet"}</h3>
      <p>{mode === "saved" ? "Tap the heart on a café you want to remember." : "Try a different filter or search."}</p>
      {mode !== "saved" && <button className="secondary-btn" onClick={onReset}>Show all picks</button>}
    </div>
  );
}

function BusinessPage({ onBack }) {
  const [form, setForm] = useState({ business_name: "", contact_name: "", email: "", city: "", message: "" });
  const [status, setStatus] = useState("idle");

  async function submit(e) {
    e.preventDefault();
    setStatus("sending");
    const body = new URLSearchParams({ "form-name": "fika-business-interest", ...form }).toString();
    try {
      const res = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!res.ok) throw new Error("submit_failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="business-page">
      <button className="back-link" onClick={onBack}>← Back to the guide</button>
      <section className="business-hero">
        <p className="eyebrow light">Fika for cafés · founding program</p>
        <h1>Turn a good café into a place people <em>remember.</em></h1>
        <p>Worth the Fika is building a more useful kind of café guide: specific, editorial and built around what guests actually come for — the flat white, the cardamom bun, the quiet corner, the date-night table.</p>
        <a className="business-cta" href="#partner">Join the founding cafés <Arrow /></a>
      </section>

      <section className="business-proof">
        <div><strong>01</strong><h3>Be discoverable for a reason</h3><p>Show up for the moments that matter: best pastry, laptop-friendly, cozy solo, date café and more.</p></div>
        <div><strong>02</strong><h3>Own your story</h3><p>Highlight your signature products, atmosphere and what makes the room worth a detour.</p></div>
        <div><strong>03</strong><h3>Learn what resonates</h3><p>Our founding program is designed around useful profile insights and social-ready storytelling, without pay-to-win rankings.</p></div>
      </section>

      <section className="partner-card" id="partner">
        <div>
          <p className="eyebrow">Founding café invitation</p>
          <h2>Help shape the café side of Fika.</h2>
          <p>We are starting small in Copenhagen. Founding cafés get direct input into the business tools we build next. Editorial scores stay independent.</p>
          <ul><li>Profile review and positioning</li><li>Signature-product highlights</li><li>Early access to café tools</li><li>No paid ranking boosts</li></ul>
        </div>
        {status === "sent" ? (
          <div className="form-success"><span>✓</span><h3>You're on the list.</h3><p>Thanks — we’ll follow up with the founding café details.</p></div>
        ) : (
          <form className="partner-form" name="fika-business-interest" onSubmit={submit}>
            <input type="hidden" name="form-name" value="fika-business-interest" />
            <label>Café / business<input required value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Your café" /></label>
            <label>Your name<input required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Name" /></label>
            <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@cafe.com" /></label>
            <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Copenhagen" /></label>
            <label>Anything we should know?<textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what makes your café special." /></label>
            <button className="primary-btn dark" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Request founding access"} <Arrow /></button>
            {status === "error" && <p className="form-error">Something went wrong. Please try again.</p>}
          </form>
        )}
      </section>
    </main>
  );
}

function AdminPanel({ cafes, setCafes, onExit }) {
  const [code, setCode] = useState(() => sessionStorage.getItem("wtfika:admin") || "");
  const [unlocked, setUnlocked] = useState(Boolean(sessionStorage.getItem("wtfika:admin")));
  const [selectedId, setSelectedId] = useState(cafes[0]?.id ?? null);
  const [status, setStatus] = useState("");
  const selected = cafes.find((c) => String(c.id) === String(selectedId)) || cafes[0];

  function login(e) {
    e.preventDefault();
    if (!code.trim()) return;
    sessionStorage.setItem("wtfika:admin", code.trim());
    setUnlocked(true);
  }

  function patch(field, value) {
    setCafes((prev) => prev.map((c) => c.id === selected.id ? { ...c, [field]: value } : c));
  }

  function patchNested(group, field, value) {
    setCafes((prev) => prev.map((c) => c.id === selected.id ? { ...c, [group]: { ...(c[group] || {}), [field]: value } } : c));
  }

  function addCafe() {
    const id = Date.now();
    const next = { id, name: "New café", city: "Copenhagen", country: "Denmark", scene: "", imgs: null, drink: { type: "", mod: "", subtype: "", temp: "Hot", price: 0, note: "", ratings: { Taste: 0 } }, pastry: { type: "", subtype: "", mod: "", temp: "Hot", price: 0, note: "", ratings: { Flavour: 0 } }, atmosphere: 0, service: 0, value: 0, bestFor: [], reason: "", take: "" };
    setCafes((prev) => [next, ...prev]);
    setSelectedId(id);
  }

  async function publish() {
    setStatus("Publishing…");
    try {
      const res = await fetch(CAFE_API, { method: "POST", headers: { "content-type": "application/json", "x-admin-code": code }, body: JSON.stringify({ cafes }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Publish failed");
      setStatus("Published ✓");
      setTimeout(() => setStatus(""), 2500);
    } catch (err) {
      setStatus(err.message === "unauthorized" ? "Wrong admin code" : "Publish failed");
      if (err.message === "unauthorized") { sessionStorage.removeItem("wtfika:admin"); setUnlocked(false); }
    }
  }

  if (!unlocked) {
    return <main className="admin-login"><form onSubmit={login}><FikaMark /><p className="eyebrow">Private editor</p><h1>Fika editor</h1><p>Enter the Netlify admin code. It is never bundled into the public app.</p><input type="password" value={code} onChange={(e) => setCode(e.target.value)} autoFocus placeholder="Admin code" /><button className="primary-btn">Continue <Arrow /></button><button type="button" className="text-link" onClick={onExit}>Return to site</button></form></main>;
  }

  if (!selected) return <main className="admin-shell"><button onClick={addCafe}>Add first café</button></main>;

  return (
    <main className="admin-shell">
      <header className="admin-header"><div><p className="eyebrow">Private editor</p><h1>Worth the Fika</h1></div><div className="admin-actions"><span>{status}</span><button className="secondary-btn" onClick={onExit}>Preview</button><button className="primary-btn" onClick={publish}>Publish</button></div></header>
      <div className="admin-grid">
        <aside className="admin-list"><button className="new-btn" onClick={addCafe}>+ Add café</button>{cafes.map((c) => <button key={c.id} className={c.id === selected.id ? "active" : ""} onClick={() => setSelectedId(c.id)}><strong>{c.name}</strong><span>{c.city} · {cafeScore(c) || "–"}/100</span></button>)}</aside>
        <section className="admin-editor">
          <div className="admin-preview"><CafeArt cafe={selected} compact /><ScorePill cafe={selected} /></div>
          <div className="field-grid">
            <label>Café name<input value={selected.name || ""} onChange={(e) => patch("name", e.target.value)} /></label>
            <label>City<input value={selected.city || ""} onChange={(e) => patch("city", e.target.value)} /></label>
            <label>Country<input value={selected.country || ""} onChange={(e) => patch("country", e.target.value)} /></label>
            <label>Scene<input value={selected.scene || ""} onChange={(e) => patch("scene", e.target.value)} placeholder="Nordic minimal" /></label>
            <label className="wide">Editorial take<textarea value={selected.take || ""} onChange={(e) => patch("take", e.target.value)} /></label>
            <label className="wide">Why it's worth it<textarea value={selected.reason || ""} onChange={(e) => patch("reason", e.target.value)} /></label>
            <label>Drink<input value={selected.drink?.type || ""} onChange={(e) => patchNested("drink", "type", e.target.value)} /></label>
            <label>Drink detail<input value={selected.drink?.mod || ""} onChange={(e) => patchNested("drink", "mod", e.target.value)} /></label>
            <label>Drink price<input type="number" value={selected.drink?.price || 0} onChange={(e) => patchNested("drink", "price", Number(e.target.value))} /></label>
            <label>Pastry<input value={selected.pastry?.type || ""} onChange={(e) => patchNested("pastry", "type", e.target.value)} /></label>
            <label>Pastry detail<input value={selected.pastry?.subtype || ""} onChange={(e) => patchNested("pastry", "subtype", e.target.value)} /></label>
            <label>Pastry price<input type="number" value={selected.pastry?.price || 0} onChange={(e) => patchNested("pastry", "price", Number(e.target.value))} /></label>
            <label>Atmosphere /5<input type="number" min="0" max="5" step="0.5" value={selected.atmosphere || 0} onChange={(e) => patch("atmosphere", Number(e.target.value))} /></label>
            <label>Service /5<input type="number" min="0" max="5" step="0.5" value={selected.service || 0} onChange={(e) => patch("service", Number(e.target.value))} /></label>
            <label>Value /5<input type="number" min="0" max="5" step="0.5" value={selected.value || 0} onChange={(e) => patch("value", Number(e.target.value))} /></label>
            <label className="wide">Best for (comma separated)<input value={(selected.bestFor || []).join(", ")} onChange={(e) => patch("bestFor", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></label>
          </div>
          <div className="danger-row"><button onClick={() => { if (confirm(`Delete ${selected.name}?`)) { setCafes((p) => p.filter((c) => c.id !== selected.id)); setSelectedId(cafes.find((c) => c.id !== selected.id)?.id ?? null); } }}>Delete café</button></div>
        </section>
      </div>
    </main>
  );
}

export default function App() {
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState("all");
  const [view, setView] = useState("discover");
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
  });
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const isAdmin = new URLSearchParams(window.location.search).get("admin") === "1";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(CAFE_API, { headers: { accept: "application/json" } });
        const live = r.ok ? await r.json() : [];
        if (!cancelled && Array.isArray(live) && live.length) setCafes(live);
        else {
          const fallback = await fetch("/cafes.json").then((x) => x.json());
          if (!cancelled) setCafes(Array.isArray(fallback) ? fallback : []);
        }
      } catch {
        try {
          const fallback = await fetch("/cafes.json").then((x) => x.json());
          if (!cancelled) setCafes(Array.isArray(fallback) ? fallback : []);
        } catch { if (!cancelled) setCafes([]); }
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem(NAME_KEY, name); }, [name]);

  function toggleSave(id) {
    setSaved((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const sorted = useMemo(() => [...cafes].sort((a, b) => cafeScore(b) - cafeScore(a)), [cafes]);
  const visible = useMemo(() => {
    let list = view === "saved" ? sorted.filter((c) => saved.includes(c.id)) : sorted;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => [c.name, c.city, c.scene, c.take, c.reason, c.drink?.type, c.pastry?.type, ...(c.bestFor || [])].filter(Boolean).join(" ").toLowerCase().includes(q));
    if (mood === "coffee") list = list.filter((c) => categoryAverage(c.drink) >= 4.3);
    else if (mood === "pastry") list = list.filter((c) => categoryAverage(c.pastry) >= 4.3);
    else if (mood !== "all") list = list.filter((c) => (c.bestFor || []).includes(mood));
    return list;
  }, [sorted, saved, view, query, mood]);

  if (isAdmin) return <AdminPanel cafes={cafes} setCafes={setCafes} onExit={() => { window.history.replaceState({}, "", "/"); window.location.reload(); }} />;
  if (view === "business") return <BusinessPage onBack={() => setView("discover")} />;

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => { setView("discover"); setMood("all"); setQuery(""); }}><FikaMark /><span><b>WORTH THE</b> FIKA</span></button>
        <nav><button className={view === "discover" ? "active" : ""} onClick={() => setView("discover")}>Discover</button><button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}>Saved <span className="nav-count">{saved.length}</span></button><button onClick={() => setView("business")}>For cafés</button></nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Independent café guide · Copenhagen</p>
            <h1>Find the café <em>worth crossing</em> town for.</h1>
            <p className="hero-sub">Not another five-star list. Specific picks for the coffee, pastry and moment you actually want.</p>
            <div className="search-box"><SearchIcon /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search café, pastry, mood…" /><kbd>⌘ K</kbd></div>
          </div>
          <div className="hero-note">
            <span className="note-number">{String(sorted.length).padStart(2, "0")}</span>
            <p>curated café reviews<br />and counting</p>
            <i />
            <p className="small">Rankings are editorial.<br />Never pay-to-win.</p>
          </div>
        </section>

        <section className="filter-section">
          <div className="section-heading"><div><p className="eyebrow">Choose the moment</p><h2>{view === "saved" ? (name ? `${name}'s saved fika` : "Your saved fika") : "What are you in the mood for?"}</h2></div>{view === "saved" && !name && <button className="name-btn" onClick={() => { const n = prompt("What should we call your list?"); if (n?.trim()) setName(n.trim()); }}>Name your list</button>}</div>
          <div className="mood-row">{MOODS.map((m) => <button key={m.id} className={mood === m.id ? "active" : ""} onClick={() => setMood(m.id)}>{m.label}</button>)}</div>
        </section>

        <section className="results-section">
          <div className="results-meta"><span>{loading ? "Loading the good stuff…" : `${visible.length} ${visible.length === 1 ? "place" : "places"}`}</span><span>{view === "saved" ? "Saved by you" : "Ranked by the full fika"}</span></div>
          {loading ? <div className="loading-grid">{[1,2,3].map((x) => <div className="skeleton" key={x} />)}</div> : visible.length ? (
            <div className="cafe-grid">{visible.map((cafe) => <CafeCard key={cafe.id} cafe={cafe} rank={sorted.findIndex((c) => c.id === cafe.id) + 1} saved={saved.includes(cafe.id)} onSave={toggleSave} onOpen={setSelected} />)}</div>
          ) : <EmptyState mode={view} onReset={() => { setMood("all"); setQuery(""); }} />}
        </section>

        <section className="manifesto">
          <p className="eyebrow light">The Fika standard</p>
          <h2>A rating should tell you <em>why to go.</em></h2>
          <div className="manifesto-grid"><div><strong>01</strong><p>We score the actual cup and pastry, not just the room.</p></div><div><strong>02</strong><p>We tell you the moment it is best for: work, date, solo, friends.</p></div><div><strong>03</strong><p>Business partnerships never buy a higher editorial rank.</p></div></div>
        </section>
      </main>

      <footer><div className="brand footer-brand"><FikaMark /><span><b>WORTH THE</b> FIKA</span></div><p>Curated slowly. Drunk enthusiastically.</p><div><button onClick={() => setView("business")}>For cafés</button><a href="/?admin=1" rel="nofollow">Editor</a></div></footer>

      <nav className="mobile-nav"><button className={view === "discover" ? "active" : ""} onClick={() => setView("discover")}>Discover</button><button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}>Saved {saved.length ? `· ${saved.length}` : ""}</button><button onClick={() => setView("business")}>For cafés</button></nav>
      <CafeModal cafe={selected} saved={selected ? saved.includes(selected.id) : false} onSave={toggleSave} onClose={() => setSelected(null)} />
    </div>
  );
}
