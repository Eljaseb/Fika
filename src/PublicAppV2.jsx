
import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./public-v2.css";

const CAFE_API = "/api/cafes";
const SAVED_KEY = "wtfika:saved-v2";
const GEO_PREFIX = "wtfika:geo:";

function normalize(value="") {
  return value
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/&/g,"and")
    .replace(/[^a-z0-9]+/g," ")
    .trim();
}

function avg(values) {
  const nums = values.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
}

function categoryAverage(category) {
  return avg(Object.values(category?.ratings || {}));
}

function fikaScore(cafe) {
  const drink = categoryAverage(cafe?.drink);
  const pastry = categoryAverage(cafe?.pastry);
  const supporting = avg([cafe?.atmosphere, cafe?.service, cafe?.value]);
  const hero = avg([drink,pastry].filter(Boolean));
  const blended = hero && supporting ? hero * .72 + supporting * .28 : hero || supporting || 0;
  return blended ? Math.round(blended * 20) : 0;
}

function Mark() {
  return <div className="v2-mark">F</div>;
}

function PinIcon({rated=false}) {
  return <span className={rated ? "v2-status rated" : "v2-status"}>{rated ? "Rated by Worth the Fika" : "Not rated yet"}</span>;
}

function Heart({filled=false}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.25s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.85c0 5.6-7.5 10.2-7.5 10.2Z" fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}

function matchReview(catalogCafe, reviews) {
  const byId = reviews.find((r) => r.catalogId && r.catalogId === catalogCafe.id);
  if (byId) return byId;
  const names = [catalogCafe.name, ...(catalogCafe.aliases || [])].map(normalize);
  return reviews.find((r) => names.includes(normalize(r.name)));
}

function publicRatingText(cafe) {
  if (!cafe.rank && cafe.sources?.includes("Worth the Fika")) return "Your published review";
  if (!cafe.externalRating) return "Guide pick";
  return `${Number(cafe.externalRating).toFixed(1)}${cafe.externalReviews ? ` · ${cafe.externalReviews.toLocaleString()} public reviews` : ""}`;
}

function mapIcon(score) {
  return L.divIcon({
    className: "fika-map-icon-wrap",
    html: `<div class="fika-map-icon">${score || "F"}</div>`,
    iconSize: [42,42],
    iconAnchor: [21,21],
    popupAnchor: [0,-18]
  });
}

async function geocode(address) {
  if (!address) return null;
  const key = GEO_PREFIX + address;
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached?.lat && cached?.lng) return cached;
  } catch {}
  try {
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=dk&q=" + encodeURIComponent(address + ", Copenhagen, Denmark");
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    const rows = await res.json();
    if (!rows?.[0]) return null;
    const out = { lat:Number(rows[0].lat), lng:Number(rows[0].lon) };
    localStorage.setItem(key, JSON.stringify(out));
    return out;
  } catch {
    return null;
  }
}

function RatedMap({items}) {
  const [points,setPoints] = useState([]);
  useEffect(() => {
    let cancelled = false;
    (async() => {
      const next = [];
      for (const item of items) {
        const address = item.review.address || item.catalog.address;
        const point = item.review.lat && item.review.lng
          ? {lat:Number(item.review.lat),lng:Number(item.review.lng)}
          : await geocode(address);
        if (point) next.push({...item, ...point});
      }
      if (!cancelled) setPoints(next);
    })();
    return () => { cancelled = true; };
  }, [items]);

  return (
    <div className="rated-map-shell">
      <MapContainer center={[55.6761,12.5683]} zoom={12.5} scrollWheelZoom={true} className="rated-map">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {points.map((p) => (
          <Marker key={p.catalog.id} position={[p.lat,p.lng]} icon={mapIcon(fikaScore(p.review))}>
            <Popup>
              <strong>{p.catalog.name}</strong><br/>
              Worth the Fika: {fikaScore(p.review) || "–"}/100<br/>
              {p.catalog.address}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {!points.length && <div className="map-loading">Locating your rated cafés…</div>}
    </div>
  );
}

function CatalogRow({cafe,review,saved,onSave,onOpen}) {
  const rated = Boolean(review);
  return (
    <article className="catalog-row">
      <div className="rank-no">{cafe.rank ? String(cafe.rank).padStart(2,"0") : "WT"}</div>
      <div className="catalog-main">
        <div className="catalog-title-line">
          <div>
            <h3>{cafe.name}</h3>
            <p>{cafe.address}</p>
          </div>
          <PinIcon rated={rated}/>
        </div>
        <p className="catalog-why">{cafe.why}</p>
        <div className="catalog-meta">
          <span>{cafe.kind}</span>
          <span>{publicRatingText(cafe)}</span>
          {cafe.distanceKm != null && <span>≈ {cafe.distanceKm} km from centre</span>}
          {rated && <span className="own-score">WT Fika {fikaScore(review)}/100</span>}
        </div>
      </div>
      <div className="catalog-actions">
        <button className={saved ? "save-list saved" : "save-list"} onClick={()=>onSave(cafe.id)} aria-label="Save"><Heart filled={saved}/></button>
        <button className="row-open" onClick={()=>onOpen(cafe)}>View</button>
      </div>
    </article>
  );
}

function Detail({cafe,review,onClose}) {
  if (!cafe) return null;
  const score = review ? fikaScore(review) : null;
  const cover = Array.isArray(review?.imgs) ? review.imgs[0] : null;
  return (
    <div className="v2-modal-backdrop" onMouseDown={onClose}>
      <section className="v2-modal" onMouseDown={(e)=>e.stopPropagation()}>
        <button className="v2-close" onClick={onClose}>×</button>
        <div className="v2-modal-hero">
          {cover ? <img src={cover} alt=""/> : <div className="v2-placeholder">{cafe.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("")}</div>}
          <div className="v2-modal-overlay"><span>{cafe.rank ? `#${cafe.rank} · Copenhagen 50` : "Worth the Fika review"}</span><h2>{cafe.name}</h2></div>
        </div>
        <div className="v2-modal-body">
          <div className="detail-status-row">
            <PinIcon rated={Boolean(review)}/>
            <span>{publicRatingText(cafe)}</span>
          </div>
          <p className="detail-address">{cafe.address}</p>
          <p className="detail-why">{cafe.why}</p>
          {review ? (
            <div className="review-box">
              <div className="review-score"><strong>{score}</strong><span>/100</span></div>
              <div><p className="eyebrow-v2">Worth the Fika verdict</p><h3>{review.take || review.reason || "Rated by Worth the Fika"}</h3><p>{review.reason || ""}</p></div>
            </div>
          ) : (
            <div className="not-rated-box">
              <h3>Not rated by Worth the Fika yet.</h3>
              <p>This café is in the researched Copenhagen shortlist, but it does not have an in-app tasting review yet.</p>
              <a href={`/?admin=1&cafe=${encodeURIComponent(cafe.id)}`}>Rate this café in Creator Studio →</a>
            </div>
          )}
          <div className="detail-links">
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name+" "+cafe.address)}`} target="_blank" rel="noreferrer">Open in Maps</a>
            <a href={`/?admin=1&cafe=${encodeURIComponent(cafe.id)}`}>Creator Studio</a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function PublicAppV2() {
  const [catalog,setCatalog] = useState([]);
  const [reviews,setReviews] = useState([]);
  const [loading,setLoading] = useState(true);
  const [view,setView] = useState("all");
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState(null);
  const [saved,setSaved] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(SAVED_KEY,JSON.stringify(saved)); }, [saved]);

  useEffect(() => {
    let cancelled = false;
    (async()=>{
      try {
        const [catRes,revRes] = await Promise.all([fetch("/copenhagen50.json"),fetch(CAFE_API)]);
        const cat = await catRes.json();
        const rev = revRes.ok ? await revRes.json() : [];
        if (!cancelled) {
          setCatalog(cat?.cafes || []);
          setReviews(Array.isArray(rev) ? rev : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const enriched = useMemo(() => catalog.map(cafe => ({catalog:cafe,review:matchReview(cafe,reviews)})), [catalog,reviews]);
  const ratedFrom50 = useMemo(() => enriched.filter(x=>x.review), [enriched]);
  const customRated = useMemo(() => reviews
    .filter(review => !enriched.some(x => x.review && String(x.review.id) === String(review.id)))
    .map((review, index) => ({
      catalog: {
        id: "custom-" + review.id,
        rank: null,
        name: review.name || "Untitled café",
        address: review.address || [review.city,review.country].filter(Boolean).join(", "),
        distanceKm: null,
        externalRating: null,
        externalReviews: null,
        kind: "Worth the Fika review",
        why: review.reason || review.take || "Personally rated in Worth the Fika.",
        sources: ["Worth the Fika"]
      },
      review
    })), [reviews,enriched]);
  const rated = useMemo(() => [...ratedFrom50, ...customRated], [ratedFrom50,customRated]);
  const visible = useMemo(() => {
    let list = view === "rated" ? rated : view === "saved" ? enriched.filter(x=>saved.includes(x.catalog.id)) : enriched;
    const q = normalize(query);
    if (q) list = list.filter(x => normalize([x.catalog.name,x.catalog.address,x.catalog.kind,x.catalog.why].join(" ")).includes(q));
    return list;
  }, [view,rated,enriched,saved,query]);

  function toggleSave(id) {
    setSaved(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  }

  const selectedReview = selected ? matchReview(selected,reviews) : null;

  return (
    <div className="v2-shell">
      <header className="v2-header">
        <button className="v2-brand" onClick={()=>setView("all")}><Mark/><span><b>WORTH THE</b> FIKA</span></button>
        <nav>
          <button className={view==="all"?"active":""} onClick={()=>setView("all")}>Copenhagen 50</button>
          <button className={view==="rated"?"active":""} onClick={()=>setView("rated")}>Rated <span>{rated.length}</span></button>
          <button className={view==="saved"?"active":""} onClick={()=>setView("saved")}>Saved <span>{saved.length}</span></button>
          <a href="/?admin=1">Creator</a>
        </nav>
      </header>

      <main className="v2-main">
        <section className="v2-hero">
          <p className="eyebrow-v2">Copenhagen · researched within ~5 km of the city centre</p>
          <h1>50 cafés worth knowing.<br/><em>Your ratings decide which are truly worth the fika.</em></h1>
          <p>We started with the strongest café and specialty-coffee candidates from Copenhagen guides and current public ratings. A public rating is only a discovery signal — the red badge appears only after a real Worth the Fika tasting review.</p>
          <div className="v2-stats">
            <div><strong>50</strong><span>researched cafés</span></div>
            <div><strong>{rated.length}</strong><span>your published ratings</span></div>
            <div><strong>{Math.max(0,50-ratedFrom50.length)}</strong><span>Top 50 still to taste</span></div>
          </div>
        </section>

        <section className="v2-toolbar">
          <div className="v2-tabs">
            <button className={view==="all"?"active":""} onClick={()=>setView("all")}>All 50</button>
            <button className={view==="rated"?"active":""} onClick={()=>setView("rated")}>Rated by Worth the Fika</button>
            <button className={view==="saved"?"active":""} onClick={()=>setView("saved")}>Saved</button>
          </div>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search café, neighbourhood, bakery…"/>
        </section>

        {view==="rated" && <section className="rated-map-section">
          <div className="section-copy"><p className="eyebrow-v2">Your tasting map</p><h2>Where you have already been.</h2><p>Every published Worth the Fika review appears here — including cafés outside the Copenhagen 50. Reviews linked to the shortlist inherit the exact branch address.</p></div>
          <RatedMap items={rated}/>
        </section>}

        <section className="catalog-section">
          <div className="catalog-heading">
            <div><p className="eyebrow-v2">{view==="rated"?"Your rated cafés":view==="saved"?"Your saved cafés":"Research shortlist"}</p><h2>{loading?"Loading…":`${visible.length} cafés`}</h2></div>
            <p>{view==="all" ? "Ordered by a mix of café relevance, guide recognition, public reputation and distinctiveness — not by Google score alone." : view==="rated" ? "These have a real in-app Worth the Fika tasting score." : "Places you marked to remember."}</p>
          </div>
          <div className="catalog-list">
            {visible.map(({catalog:cafe,review}) => <CatalogRow key={cafe.id} cafe={cafe} review={review} saved={saved.includes(cafe.id)} onSave={toggleSave} onOpen={setSelected}/>)}
          </div>
        </section>

        <section className="research-note">
          <div><p className="eyebrow-v2">How this list works</p><h2>Research first. Taste second.</h2></div>
          <p>The shortlist combines current guide coverage and public business ratings. Those external signals help decide where to go next, but they never become a Worth the Fika score. Only your own tasting review does.</p>
        </section>
      </main>

      <nav className="v2-mobile-nav">
        <button className={view==="all"?"active":""} onClick={()=>setView("all")}>Top 50</button>
        <button className={view==="rated"?"active":""} onClick={()=>setView("rated")}>Rated · {rated.length}</button>
        <button className={view==="saved"?"active":""} onClick={()=>setView("saved")}>Saved · {saved.length}</button>
      </nav>

      <Detail cafe={selected} review={selectedReview} onClose={()=>setSelected(null)}/>
    </div>
  );
}
