import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./public-v2.css";

const CAFE_API = "/api/cafes";
const SAVED_KEY = "wtfika:saved-v4";
const CITY_KEY = "wtfika:city-v1";
const GEO_PREFIX = "wtfika:geo:v4:";
const INSTAGRAM_URL = "https://www.instagram.com/worththefika/";

const CITY_CONFIG = {
  copenhagen: {
    key:"copenhagen",
    name:"Copenhagen",
    country:"Denmark",
    flag:"🇩🇰",
    dataUrl:"/copenhagen50.json",
    center:[55.6761,12.5683],
    eyebrow:"CENTRAL COPENHAGEN · ~5 KM RADIUS",
    title:"Copenhagen Top 50",
    intro:"Specialty coffee, ambitious bakeries and destination cafés. Real tasting decides what is truly worth the fika.",
    mapEyebrow:"THE 50 ON A COPENHAGEN MAP",
    mapTitle:"Plan your next Copenhagen café stop."
  },
  stockholm: {
    key:"stockholm",
    name:"Stockholm",
    country:"Sweden",
    flag:"🇸🇪",
    dataUrl:"/stockholm50.json",
    center:[59.3293,18.0686],
    eyebrow:"CENTRAL STOCKHOLM · ~5 KM RADIUS",
    title:"Stockholm Top 50",
    intro:"A city built for fika: serious coffee, world-class bakeries and classic konditori. Real tasting decides what earns the Fika score.",
    mapEyebrow:"THE 50 ON A STOCKHOLM MAP",
    mapTitle:"Plan your next Stockholm fika stop."
  }
};

function normalize(value="") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
}

function avg(values) {
  const nums = values.map(Number).filter(n => Number.isFinite(n) && n > 0);
  return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
}

function categoryAverage(category) {
  return avg(Object.values(category?.ratings || {}));
}

function fikaScore(cafe) {
  const drink = categoryAverage(cafe?.drink);
  const pastry = categoryAverage(cafe?.pastry);
  const supporting = avg([cafe?.atmosphere,cafe?.service,cafe?.value]);
  const hero = avg([drink,pastry].filter(Boolean));
  const blended = hero && supporting ? hero * .72 + supporting * .28 : hero || supporting || 0;
  return blended ? Math.round(blended * 20) : 0;
}

function fika10(cafe) {
  const score = fikaScore(cafe);
  return score ? (score / 10).toFixed(1) : null;
}

function category10(category) {
  const score = categoryAverage(category);
  return score ? (score * 2).toFixed(1) : null;
}

function Mark() {
  return <div className="wtf-mark"><span>☕</span></div>;
}

function Heart({filled=false}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.25s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.85c0 5.6-7.5 10.2-7.5 10.2Z" fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}

function InstagramIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.4" cy="6.8" r="1.15" fill="currentColor"/></svg>;
}

function InstagramLink({compact=false}) {
  return <a className={compact?"instagram-link compact":"instagram-link"} href={INSTAGRAM_URL} aria-label="Open Worth the Fika on Instagram" rel="noreferrer">
    <InstagramIcon/><span>{compact?"Instagram":"@worththefika"}</span>
  </a>;
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="m4.8 7.3 7.2 5.6 7.2-5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ContactButton({onClick}) {
  return <button className="contact-button" onClick={onClick} aria-label="Contact Worth the Fika"><MailIcon/><span>Contact</span></button>;
}

function ContactModal({open,onClose,city}) {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");
  const [status,setStatus]=useState("");

  useEffect(()=>{
    if(!open)return;
    const onKey=e=>{if(e.key==="Escape")onClose()};
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[open,onClose]);

  if(!open)return null;

  async function submit(e){
    e.preventDefault();
    setStatus("Sending…");
    const body=new URLSearchParams({
      "form-name":"fika-business-interest",
      "subject":"New Worth the Fika message",
      "business_name":"",
      "contact_name":name,
      "email":email,
      "city":city?.name||"",
      "message":message,
      "bot-field":""
    });
    try{
      const res=await fetch("/",{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:body.toString()
      });
      if(!res.ok)throw new Error("send_failed");
      setStatus("Message sent ✓");
      setName("");setEmail("");setMessage("");
    }catch{
      setStatus("Could not send. Please try again.");
    }
  }

  return <div className="contact-backdrop" onMouseDown={onClose}>
    <section className="contact-modal" onMouseDown={e=>e.stopPropagation()}>
      <button className="contact-close" onClick={onClose} aria-label="Close">×</button>
      <p className="eyebrow">CONTACT WORTH THE FIKA</p>
      <h2>Send a message</h2>
      <p className="contact-intro">Questions, café suggestions or collaborations — write here. Your message goes privately to the person behind Worth the Fika.</p>
      <form onSubmit={submit}>
        <label>Name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Your name"/></label>
        <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/></label>
        <label>Message<textarea required rows="6" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write your message…"/></label>
        <button className="send-message" type="submit" disabled={status==="Sending…"}>Send message</button>
        {status&&<p className={status.includes("sent")?"contact-status success":"contact-status"}>{status}</p>}
      </form>
    </section>
  </div>;
}

function matchReview(catalogCafe,reviews) {
  const byId = reviews.find(r => r.catalogId && r.catalogId === catalogCafe.id);
  if (byId) return byId;
  const names = [catalogCafe.name,...(catalogCafe.aliases || [])].map(normalize);
  return reviews.find(r => names.includes(normalize(r.name)));
}

function coverOf(review) {
  return Array.isArray(review?.imgs) ? review.imgs.find(Boolean) : null;
}

function initials(name="Fika") {
  return String(name).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
}

function publicRatingText(cafe) {
  if (!cafe.rank && cafe.sources?.includes("Worth the Fika")) return "Your published review";
  if (!cafe.externalRating) return "Guide pick";
  return `${Number(cafe.externalRating).toFixed(1)} ★${cafe.externalReviews ? ` · ${cafe.externalReviews.toLocaleString()} reviews` : ""}`;
}

function firstTag(cafe,review) {
  return review?.bestFor?.[0] || String(cafe.kind || "Café").split("·")[0].trim();
}

function mapIcon(rated,score) {
  return L.divIcon({
    className:"wtf-map-icon-wrap",
    html:`<div class="wtf-map-pin ${rated ? "rated" : "todo"}"><span>☕</span>${rated && score ? `<b>${score}</b>` : ""}</div>`,
    iconSize:[40,48],
    iconAnchor:[20,46],
    popupAnchor:[0,-42]
  });
}

async function geocode(address,city,country) {
  if (!address) return null;
  const key = GEO_PREFIX + city + ":" + address;
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached?.lat && cached?.lng) return cached;
  } catch {}
  try {
    const url = "https://photon.komoot.io/api/?limit=1&q=" + encodeURIComponent([address,city,country].filter(Boolean).join(", "));
    const res = await fetch(url,{headers:{Accept:"application/json"}});
    const data = await res.json();
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!coords) return null;
    const out = {lat:Number(coords[1]),lng:Number(coords[0])};
    localStorage.setItem(key,JSON.stringify(out));
    return out;
  } catch {
    return null;
  }
}

function CafeMap({items,allMode=false,onOpen,city}) {
  const [points,setPoints] = useState([]);

  useEffect(()=>{
    let cancelled = false;
    setPoints([]);
    (async()=>{
      const direct = [];
      const needGeo = [];
      for (const item of items) {
        const lat = Number(item.review?.lat ?? item.catalog?.lat);
        const lng = Number(item.review?.lng ?? item.catalog?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng) direct.push({...item,lat,lng});
        else needGeo.push(item);
      }
      if (!cancelled) setPoints(direct);
      const workers = Array.from({length:Math.min(6,needGeo.length)}, async(_,workerIndex)=>{
        for (let i=workerIndex;i<needGeo.length;i+=6) {
          const item = needGeo[i];
          const point = await geocode(item.review?.address || item.catalog.address,city.name,city.country);
          if (point && !cancelled) {
            setPoints(prev => prev.some(p=>p.catalog.id===item.catalog.id) ? prev : [...prev,{...item,...point}]);
          }
        }
      });
      await Promise.all(workers);
    })();
    return ()=>{cancelled=true};
  },[items,city.key]);

  return <div className="map-shell">
    <MapContainer key={city.key} center={city.center} zoom={12.4} scrollWheelZoom className="wtf-map">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      {points.map(point=>{
        const rated = Boolean(point.review);
        const score = rated ? fika10(point.review) : null;
        return <Marker key={point.catalog.id} position={[point.lat,point.lng]} icon={mapIcon(rated,score)}>
          <Popup>
            <div className="map-popup">
              {point.catalog.image && <img className="map-popup-photo" src={point.catalog.image} alt="" loading="lazy"/>}
              <strong>{point.catalog.name}</strong>
              <span>{rated ? `Worth the Fika · ${score}/10` : "Not Fika-rated yet"}</span>
              <small>{point.catalog.address}</small>
              <button onClick={()=>onOpen?.(point.catalog)}>View café</button>
            </div>
          </Popup>
        </Marker>;
      })}
    </MapContainer>
    <div className="map-legend">
      <span><i className="legend-dot rated"/>Fika-rated {items.filter(x=>x.review).length}</span>
      {allMode && <span><i className="legend-dot todo"/>To taste {items.filter(x=>!x.review).length}</span>}
    </div>
    {points.length < items.length && <div className="map-progress">Locating cafés · {points.length}/{items.length}</div>}
  </div>;
}

function CafeThumb({cafe,review}) {
  const cover = coverOf(review) || cafe.image;
  const [failed,setFailed] = useState(false);
  useEffect(()=>setFailed(false),[cover]);
  return <div className="cafe-thumb">
    {cover && !failed ? <img src={cover} alt={cafe.name} loading="lazy" onError={()=>setFailed(true)}/> : <div className="thumb-fallback"><span>{initials(cafe.name)}</span><small>{cafe.rank ? `#${cafe.rank}` : "WT"}</small></div>}
  </div>;
}

function CatalogCard({cafe,review,saved,onSave,onOpen}) {
  const rated = Boolean(review);
  const score = rated ? fika10(review) : null;
  return <article className={`cafe-list-card ${rated ? "is-rated" : ""}`} onClick={()=>onOpen(cafe)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onOpen(cafe)}}}>
    <CafeThumb cafe={cafe} review={review}/>
    <div className="cafe-list-copy">
      <div className="cafe-name-row">
        <div>
          <h3>{cafe.name}</h3>
          <p>⌖ {cafe.address}</p>
        </div>
        {rated ? <div className="mini-score"><strong>{score}</strong><span>/10</span></div> : <span className="rank-chip">#{cafe.rank}</span>}
      </div>
      <div className="tag-line">
        <span>{firstTag(cafe,review)}</span>
        {review?.scene && <span>{review.scene}</span>}
        {rated && <span className="rated-tag">✓ Fika-rated</span>}
      </div>
      {!rated && <p className="public-signal">{publicRatingText(cafe)} · {cafe.distanceKm != null ? `≈ ${cafe.distanceKm} km from centre` : cafe.city || ""}</p>}
    </div>
    <button className={`bookmark ${saved ? "saved" : ""}`} onClick={(e)=>{e.stopPropagation();onSave(cafe.id)}} aria-label="Save"><Heart filled={saved}/></button>
  </article>;
}

function TasteRow({emoji,title,detail,score}) {
  if (!title) return null;
  return <div className="taste-highlight">
    <div className="taste-icon">{emoji}</div>
    <div><strong>{title}</strong>{detail && <p>{detail}</p>}</div>
    <b>{score || "–"}</b>
  </div>;
}

function Detail({cafe,review,onClose,city}) {
  if (!cafe) return null;
  const cover = coverOf(review) || cafe.image;
  const score = review ? fika10(review) : null;
  const worthTrip = review && fikaScore(review) >= 80;
  return <div className="detail-backdrop" onMouseDown={onClose}>
    <section className="editorial-detail" onMouseDown={e=>e.stopPropagation()}>
      <button className="detail-close" onClick={onClose}>×</button>
      <div className="detail-hero">
        {cover ? <img src={cover} alt={cafe.name}/> : <div className="detail-fallback">{initials(cafe.name)}</div>}
        <div className="photo-chip left">⌖ {review?.city || city.name}</div>
        {(review?.scene || firstTag(cafe,review)) && <div className="photo-chip right">☀ {review?.scene || firstTag(cafe,review)}</div>}
        {review && <div className="hero-score"><strong>{score}</strong><span>FIKA SCORE</span></div>}
      </div>
      <div className="detail-sheet">
        <div className="detail-heading">
          <p className="detail-kicker">{cafe.rank ? `${city.name} 50 · #${cafe.rank}` : "Worth the Fika review"}</p>
          <h2>{cafe.name} <span>{review?.country==="Sweden" || city.country==="Sweden" ? "🇸🇪" : "🇩🇰"}</span></h2>
          {review ? <div className="detail-badges">
            {worthTrip && <span className="worth-trip">✓ WORTH THE TRIP</span>}
            {(review.bestFor || []).slice(0,3).map(tag=><span key={tag}>{tag}</span>)}
          </div> : <span className="not-rated-pill">Not rated by Worth the Fika yet</span>}
        </div>
        {review ? <>
          <div className="taste-section">
            <p className="section-label">TASTING HIGHLIGHTS</p>
            <TasteRow emoji="☕" title={review.drink?.type} detail={review.drink?.note || review.drink?.mod} score={category10(review.drink)}/>
            <TasteRow emoji="🥐" title={review.pastry?.type} detail={review.pastry?.note || review.pastry?.subtype} score={category10(review.pastry)}/>
          </div>
          {(review.reason || review.take) && <p className="detail-verdict">{review.reason || review.take}</p>}
        </> : <>
          <p className="detail-verdict">{cafe.why}</p>
          <div className="research-signal"><strong>{publicRatingText(cafe)}</strong><span>Public ratings are only a discovery signal. The Fika score appears after a real tasting review.</span></div>
        </>}
        <div className="detail-footer">
          <div className="detail-footer-links">
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name+" "+cafe.address)}`} target="_blank" rel="noreferrer">Open in Maps</a>
            {!coverOf(review) && cafe.imageSource && <a className="source-link" href={cafe.imageSource} target="_blank" rel="noreferrer">Photo source</a>}
          </div>
          <div className="detail-social"><InstagramLink compact/><span>Worth the Fika</span></div>
        </div>
      </div>
    </section>
  </div>;
}

export default function PublicAppV2() {
  const [cityKey,setCityKey] = useState(()=>{
    const saved = localStorage.getItem(CITY_KEY);
    return CITY_CONFIG[saved] ? saved : "copenhagen";
  });
  const city = CITY_CONFIG[cityKey];
  const [catalog,setCatalog] = useState([]);
  const [reviews,setReviews] = useState([]);
  const [loading,setLoading] = useState(true);
  const [view,setView] = useState("all");
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState(null);
  const [contactOpen,setContactOpen] = useState(false);
  const [saved,setSaved] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
  });

  useEffect(()=>localStorage.setItem(SAVED_KEY,JSON.stringify(saved)),[saved]);
  useEffect(()=>localStorage.setItem(CITY_KEY,cityKey),[cityKey]);

  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    setSelected(null);
    setQuery("");
    (async()=>{
      try{
        const [catRes,revRes]=await Promise.all([fetch(city.dataUrl),fetch(CAFE_API)]);
        const cat=await catRes.json();
        const rev=revRes.ok?await revRes.json():[];
        if(!cancelled){
          setCatalog((cat?.cafes||[]).map(item=>({...item,city:city.name,country:city.country})));
          setReviews(Array.isArray(rev)?rev:[]);
        }
      } finally { if(!cancelled)setLoading(false) }
    })();
    return()=>{cancelled=true};
  },[cityKey]);

  const enriched = useMemo(()=>catalog.map(cafe=>({catalog:cafe,review:matchReview(cafe,reviews)})),[catalog,reviews]);
  const ratedFrom50 = useMemo(()=>enriched.filter(x=>x.review),[enriched]);

  const customRated = useMemo(()=>{
    const currentCity = normalize(city.name);
    return reviews
      .filter(review=>{
        if(enriched.some(x=>x.review&&String(x.review.id)===String(review.id))) return false;
        const reviewCity = normalize(review.city || "Copenhagen");
        return reviewCity === currentCity;
      })
      .map(review=>({
        catalog:{
          id:"custom-"+review.id,
          rank:null,
          name:review.name||"Untitled café",
          address:review.address||[review.city,review.country].filter(Boolean).join(", "),
          city:review.city||city.name,
          country:review.country||city.country,
          distanceKm:null,
          externalRating:null,
          externalReviews:null,
          kind:"Worth the Fika review",
          why:review.reason||review.take||"Personally rated in Worth the Fika.",
          sources:["Worth the Fika"]
        },
        review
      }));
  },[reviews,enriched,cityKey]);

  const rated = useMemo(()=>[...ratedFrom50,...customRated].sort((a,b)=>fikaScore(b.review)-fikaScore(a.review)),[ratedFrom50,customRated]);
  const featured = useMemo(()=>enriched.filter(x=>x.catalog.image || coverOf(x.review)).slice(0,3),[enriched]);

  const savedToken = id => city.key + ":" + id;
  const isSaved = id => saved.includes(savedToken(id));
  const toggleSave = id => {
    const token=savedToken(id);
    setSaved(prev=>prev.includes(token)?prev.filter(x=>x!==token):[...prev,token]);
  };

  const visible = useMemo(()=>{
    let list = view==="rated" ? rated : view==="saved" ? enriched.filter(x=>isSaved(x.catalog.id)) : enriched;
    const q=normalize(query);
    if(q) list=list.filter(x=>normalize([x.catalog.name,x.catalog.address,x.catalog.kind,x.catalog.why,x.review?.scene,...(x.review?.bestFor||[])].join(" ")).includes(q));
    return list;
  },[view,rated,enriched,saved,query,cityKey]);

  const selectedReview = selected ? (matchReview(selected,reviews) || customRated.find(x=>x.catalog.id===selected.id)?.review) : null;

  function changeCity(nextKey){
    if(nextKey===cityKey)return;
    setCityKey(nextKey);
    setView("all");
  }

  return <div className="wtf-shell">
    <header className="wtf-header">
      <button className="wtf-brand" onClick={()=>setView("all")}><Mark/><span>Worth the Fika</span></button>
      <div className="mobile-header-actions"><InstagramLink/><ContactButton onClick={()=>setContactOpen(true)}/></div>
      <nav>
        <button className={view==="all"?"active":""} onClick={()=>setView("all")}>Top 50</button>
        <button className={view==="rated"?"active":""} onClick={()=>setView("rated")}>Fika-rated <i>{rated.length}</i></button>
        <button className={view==="saved"?"active":""} onClick={()=>setView("saved")}>Saved <i>{saved.filter(x=>x.startsWith(city.key+":")).length}</i></button>
        <InstagramLink/>
        <ContactButton onClick={()=>setContactOpen(true)}/>
      </nav>
    </header>

    <main className="wtf-main">
      <section className={`app-intro ${view==="all"?"visual-home":""}`}>
        <div className="intro-main">
          <div className="city-switcher" role="group" aria-label="Choose city">
            {Object.values(CITY_CONFIG).map(option=><button key={option.key} className={cityKey===option.key?"active":""} onClick={()=>changeCity(option.key)}><span>{option.flag}</span>{option.name}</button>)}
          </div>

          {view==="all" ? <div className="hero-layout">
            <div className="hero-copy">
              <p className="eyebrow">{city.flag} {city.name.toUpperCase()} CAFÉ GUIDE</p>
              <h1>{city.name}<br/><em>Top 50</em></h1>
              <p className="hero-question">50 places. One question: <strong>worth the fika?</strong></p>

            </div>
            <div className="hero-mosaic">
              {featured.map(({catalog:cafe,review},index)=>{
                const image=coverOf(review)||cafe.image;
                return <button key={cafe.id} className={`hero-cafe hero-cafe-${index+1}`} onClick={()=>setSelected(cafe)}>
                  {image ? <img src={image} alt={cafe.name}/> : <div className="hero-fallback">{initials(cafe.name)}</div>}
                  <span className="hero-rank">#{cafe.rank}</span>
                  <div><small>{firstTag(cafe,review)}</small><strong>{cafe.name}</strong></div>
                </button>;
              })}
            </div>
          </div> : <>
            <p className="eyebrow">{city.flag} {city.name.toUpperCase()}</p>
            <h1>{view==="rated" ? `Fika-rated in ${city.name}` : `Saved in ${city.name}`}</h1>
            <p className="compact-intro">{view==="rated" ? "Personally tasted. Independently scored." : "Your own shortlist for later."}</p>
          </>}
        </div>
      </section>

      <section className="filter-row">
        <div className="segmented">
          <button className={view==="all"?"active":""} onClick={()=>setView("all")}><span>Top 50</span><b>50</b></button>
          <button className={view==="rated"?"active":""} onClick={()=>setView("rated")}><span>Fika-rated</span><b>{rated.length}</b></button>
          <button className={view==="saved"?"active":""} onClick={()=>setView("saved")}><span>Saved</span><b>{saved.filter(x=>x.startsWith(city.key+":")).length}</b></button>
        </div>
        <label className="search-field"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${city.name} cafés, neighbourhoods, vibes…`}/></label>
      </section>

      {(view==="all" || view==="rated") && <section className="map-section">
        <div className="map-copy">
          <p className="eyebrow">{view==="all"?`MAP · ${city.name.toUpperCase()}`:"YOUR FIKA MAP"}</p>
          <h2>{view==="all"?"Find your next fika.":`Your ${city.name} tastings.`}</h2>
        </div>
        <CafeMap items={view==="all"?enriched:rated} allMode={view==="all"} onOpen={setSelected} city={city}/>
      </section>}

      <section className="list-section">
        <div className="list-heading">
          <div><p className="eyebrow">{view==="rated"?"FIKA-RATED":view==="saved"?"SAVED PLACES":`${city.name.toUpperCase()} SHORTLIST`}</p><h2>{loading?"Loading…":`${visible.length} cafés`}</h2></div>
          <p>{view==="all"?"Tap a café to see why it made the list.":"Tap to open the full Fika card."}</p>
        </div>
        <div className="cafe-cards">
          {visible.map(({catalog:cafe,review})=><CatalogCard key={cafe.id} cafe={cafe} review={review} saved={isSaved(cafe.id)} onSave={toggleSave} onOpen={setSelected}/>)}
        </div>
      </section>

      <section className="editorial-note">
        <div><Mark/><div><p className="eyebrow">THE FIKA STANDARD</p><h2>Public ratings help us choose where to go. They never become the Fika score.</h2></div></div>
        <div className="editorial-note-side"><p>Every Fika score comes from an actual tasting.</p><InstagramLink/></div>
      </section>
    </main>

    <Detail cafe={selected} review={selectedReview} onClose={()=>setSelected(null)} city={city}/>
    <ContactModal open={contactOpen} onClose={()=>setContactOpen(false)} city={city}/>
  </div>;
}
