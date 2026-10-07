
import React, { useEffect, useMemo, useState } from "react";
import "./creator-v2.css";

const API = "/api/cafes";
const DRINK_CRITERIA = ["Taste","Aroma","Body / texture","Temperature","Balance"];
const PASTRY_CRITERIA = ["Flavour","Texture","Freshness","Filling","Presentation"];

function avg(values){const nums=values.map(Number).filter(n=>Number.isFinite(n)&&n>0);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0}
function score(cafe){const d=avg(Object.values(cafe?.drink?.ratings||{}));const p=avg(Object.values(cafe?.pastry?.ratings||{}));const s=avg([cafe?.atmosphere,cafe?.service,cafe?.value]);const h=avg([d,p].filter(Boolean));const total=h&&s?h*.72+s*.28:h||s||0;return total?Math.round(total*20):0}
function score10(cafe){const s=score(cafe);return s?(s/10).toFixed(1):"–"}
function category10(category){const s=avg(Object.values(category?.ratings||{}));return s?(s*2).toFixed(1):"–"}
function normalize(v=""){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function mark(){return <div className="cv2-mark" style={{background:"#f8f4eb",overflow:"hidden"}}><img src="/icons/fika-admin.svg" alt="Worth the Fika" style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}} /></div>}
function initials(name){return String(name||"Fika").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function blankRatings(list){return Object.fromEntries(list.map(x=>[x,0]))}

function newCafe(catalogCafe){
  return {
    id:Date.now(),
    catalogId:catalogCafe?.id||"",
    name:catalogCafe?.name||"New café",
    address:catalogCafe?.address||"",
    city:catalogCafe?.city||"Copenhagen",
    country:catalogCafe?.country||"Denmark",
    visitedOn:new Date().toISOString().slice(0,10),
    scene:"",
    imgs:[],
    drink:{type:"",mod:"",subtype:"",temp:"Hot",price:0,note:"",ratings:blankRatings(DRINK_CRITERIA)},
    pastry:{type:"",mod:"",subtype:"",temp:"Room temp",price:0,note:"",ratings:blankRatings(PASTRY_CRITERIA)},
    atmosphere:0,service:0,value:0,bestFor:[],take:"",reason:"",
    cardZoom:1,cardX:0,cardY:0
  };
}

function RatingSlider({label,value,onChange}){
  const n=Number(value)||0;
  return <label className="cv2-rating"><span>{label}</span><input type="range" min="0" max="5" step=".5" value={n} onChange={e=>onChange(Number(e.target.value))}/><b>{n?n.toFixed(1):"–"}</b></label>;
}

function coverPlacement(bitmap,targetW,targetH,zoom=1,xShift=0,yShift=0){
  const baseScale=Math.max(targetW/bitmap.width,targetH/bitmap.height);
  const scale=baseScale*Math.max(.7,Number(zoom)||1);
  const dw=bitmap.width*scale,dh=bitmap.height*scale;
  const dx=(targetW-dw)/2 + (Number(xShift)||0)/100*targetW*.25;
  const dy=(targetH-dh)/2 + (Number(yShift)||0)/100*targetH*.25;
  return {dx,dy,dw,dh};
}

async function loadBitmap(url){
  if(!url)return null;
  try{const r=await fetch(url);if(!r.ok)return null;return await createImageBitmap(await r.blob())}catch{return null}
}

function wrap(ctx,text,maxWidth,maxLines){
  const words=String(text||"").split(/\s+/).filter(Boolean);const lines=[];let line="";
  for(const word of words){const next=line?line+" "+word:word;if(ctx.measureText(next).width<=maxWidth||!line)line=next;else{lines.push(line);line=word;if(lines.length>=maxLines)break}}
  if(line&&lines.length<maxLines)lines.push(line);
  return lines;
}

async function exportCard(cafe,format){
  const isStory=format==="story";
  const W=1080,H=isStory?1920:1350;
  const p=62;
  const heroH=Math.round(H*(isStory?.47:.51));
  const canvas=document.createElement("canvas");
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");

  ctx.fillStyle="#fbf5e9";
  ctx.fillRect(0,0,W,H);

  const cover=Array.isArray(cafe.imgs)?cafe.imgs[0]:null;
  const bitmap=await loadBitmap(cover);
  if(bitmap){
    const place=coverPlacement(bitmap,W,heroH,Number(cafe.cardZoom)||1,Number(cafe.cardX)||0,Number(cafe.cardY)||0);
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,heroH);ctx.clip();
    ctx.fillStyle="#d5c7b5";ctx.fillRect(0,0,W,heroH);
    ctx.drawImage(bitmap,place.dx,place.dy,place.dw,place.dh);
    const shade=ctx.createLinearGradient(0,0,0,heroH);
    shade.addColorStop(0,"rgba(28,21,17,.06)");
    shade.addColorStop(.7,"rgba(28,21,17,0)");
    shade.addColorStop(1,"rgba(28,21,17,.22)");
    ctx.fillStyle=shade;ctx.fillRect(0,0,W,heroH);ctx.restore();
  }else{
    const g=ctx.createLinearGradient(0,0,W,heroH);g.addColorStop(0,"#d9b693");g.addColorStop(1,"#879477");
    ctx.fillStyle=g;ctx.fillRect(0,0,W,heroH);
    ctx.fillStyle="rgba(44,32,25,.65)";ctx.font="italic 700 185px Georgia";ctx.textAlign="center";
    ctx.fillText(initials(cafe.name),W/2,heroH/2);ctx.textAlign="left";
  }

  function pill(x,y,text,alignRight=false){
    ctx.font="700 24px Arial";
    const width=ctx.measureText(text).width+38;
    const left=alignRight?x-width:x;
    ctx.fillStyle="rgba(35,29,25,.76)";
    ctx.beginPath();ctx.roundRect(left,y,width,55,28);ctx.fill();
    ctx.fillStyle="#fffaf2";ctx.fillText(text,left+19,y+36);
    return width;
  }

  pill(p,42,"⌖ "+([cafe.city,cafe.country].filter(Boolean).join(", ")||"Copenhagen"));
  if(cafe.scene) pill(W-p,42,"☀ "+cafe.scene,true);

  const sc=score10(cafe);
  const badgeR=isStory?105:95;
  const bx=W-p-badgeR,by=heroH-badgeR+6;
  ctx.fillStyle="#fffaf2";ctx.beginPath();ctx.arc(bx,by,badgeR,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#c39a4a";ctx.lineWidth=5;ctx.stroke();
  ctx.strokeStyle="#e5c987";ctx.lineWidth=2;ctx.beginPath();ctx.arc(bx,by,badgeR-10,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle="#2c211b";ctx.textAlign="center";ctx.font=`600 ${isStory?84:74}px Georgia`;ctx.fillText(sc,bx,by+18);
  ctx.fillStyle="#a27c3d";ctx.font="800 17px Arial";ctx.fillText("FIKA SCORE",bx,by+54);ctx.textAlign="left";

  let y=heroH+86;
  ctx.fillStyle="#9b7a43";ctx.font="800 18px Arial";
  ctx.fillText("WORTH THE FIKA",p,y);y+=62;

  ctx.fillStyle="#2b211c";ctx.font=`600 ${isStory?78:70}px Georgia`;
  const titleLines=wrap(ctx,cafe.name,W-p*2,isStory?2:2);
  for(const line of titleLines){ctx.fillText(line,p,y);y+=isStory?86:76}
  y+=16;

  if(score(cafe)>=80){
    ctx.font="800 22px Arial";
    const text="✓  WORTH THE TRIP";
    const w=ctx.measureText(text).width+38;
    ctx.fillStyle="#5d744f";ctx.beginPath();ctx.roundRect(p,y,w,54,27);ctx.fill();
    ctx.fillStyle="#fff";ctx.fillText(text,p+19,y+35);y+=82;
  }

  const tags=(cafe.bestFor||[]).slice(0,3);
  if(tags.length){
    let tx=p;
    ctx.font="700 18px Arial";
    for(const tag of tags){
      const w=ctx.measureText(tag).width+30;
      if(tx+w>W-p){break}
      ctx.fillStyle="#eee5d7";ctx.beginPath();ctx.roundRect(tx,y,w,43,22);ctx.fill();
      ctx.fillStyle="#66594e";ctx.fillText(tag,tx+15,y+28);tx+=w+10;
    }
    y+=72;
  }

  ctx.fillStyle="#a88852";ctx.font="800 18px Arial";ctx.fillText("TASTING HIGHLIGHTS",p,y);
  ctx.strokeStyle="#e2d5c4";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p+245,y-5);ctx.lineTo(W-p,y-5);ctx.stroke();
  y+=45;

  function tastingRow(emoji,title,detail,rating){
    if(!title)return;
    ctx.fillStyle="#f0e4d5";ctx.beginPath();ctx.arc(p+26,y+22,26,0,Math.PI*2);ctx.fill();
    ctx.font="26px Arial";ctx.fillStyle="#2d231e";ctx.fillText(emoji,p+11,y+31);
    ctx.font="600 29px Georgia";ctx.fillText(title,p+70,y+23);
    if(detail){
      ctx.font="400 18px Arial";ctx.fillStyle="#7d7168";
      const clean=String(detail).slice(0,72);
      ctx.fillText(clean,p+70,y+50);
    }
    ctx.textAlign="right";ctx.fillStyle="#b5573d";ctx.font="700 34px Georgia";ctx.fillText(rating,W-p,y+30);ctx.textAlign="left";
    ctx.strokeStyle="#ece1d4";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p,y+71);ctx.lineTo(W-p,y+71);ctx.stroke();
    y+=88;
  }

  tastingRow("☕",cafe.drink?.type,cafe.drink?.note||cafe.drink?.mod,category10(cafe.drink));
  tastingRow("🥐",cafe.pastry?.type,cafe.pastry?.note||cafe.pastry?.subtype,category10(cafe.pastry));

  const verdict=cafe.reason||cafe.take||"A café worth remembering.";
  y+=20;ctx.fillStyle="#4f4037";ctx.font=`500 ${isStory?30:27}px Georgia`;
  for(const line of wrap(ctx,verdict,W-p*2,isStory?4:3)){ctx.fillText(line,p,y);y+=isStory?42:38}

  const footer=H-55;
  ctx.strokeStyle="#d8c7ad";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p,footer-52);ctx.lineTo(W-p,footer-52);ctx.stroke();
  ctx.fillStyle="#a88345";ctx.font="800 19px Arial";ctx.fillText("✦  FIKA REVIEWS",p,footer);
  ctx.textAlign="right";ctx.fillStyle="#6c5d51";ctx.font="700 20px Arial";ctx.fillText("@WorthTheFika",W-p,footer);ctx.textAlign="left";

  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png",1));
  if(!blob)throw new Error("card_failed");
  const u=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=u;a.download=String(cafe.name||"fika").toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+(isStory?"story":"post")+".png";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
}
function caption(cafe){
  const tags=(cafe.bestFor||[]).slice(0,4).map(x=>"#"+String(x).replace(/[^a-z0-9]+/gi,"")).filter(Boolean).join(" ");
  return [cafe.name+" · "+(cafe.city||""),"Worth the Fika score: "+score(cafe)+"/100",cafe.take||cafe.reason||"",cafe.drink?.type?"☕ "+cafe.drink.type:"",cafe.pastry?.type?"🥐 "+cafe.pastry.type:"","",tags+" #WorthTheFika #Fika"].join("\n");
}

export default function CreatorStudioV2(){
  const [cafes,setCafes]=useState([]);
  const [catalog,setCatalog]=useState([]);
  const [selectedId,setSelectedId]=useState(null);
  const [code,setCode]=useState("");
  const [ready,setReady]=useState(false);
  const [remember,setRemember]=useState(true);
  const [checkingSession,setCheckingSession]=useState(true);
  const [tab,setTab]=useState("review");
  const [status,setStatus]=useState("");
  const [uploading,setUploading]=useState(false);
  const [format,setFormat]=useState("post");
  const selected=useMemo(()=>cafes.find(c=>String(c.id)===String(selectedId))||cafes[0],[cafes,selectedId]);

  useEffect(()=>{let cancelled=false;sessionStorage.removeItem("wtfika:admin");fetch("/api/admin-check",{credentials:"same-origin",cache:"no-store"}).then(r=>{if(!cancelled)setReady(r.ok)}).catch(()=>{}).finally(()=>{if(!cancelled)setCheckingSession(false)});return()=>{cancelled=true}},[]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const [revRes,cphRes,stoRes]=await Promise.all([fetch(API),fetch("/copenhagen50.json"),fetch("/stockholm50.json")]);
        const rev=revRes.ok?await revRes.json():[];
        const cph=await cphRes.json();
        const sto=await stoRes.json();
        if(cancelled)return;
        const combined=[
          ...(cph?.cafes||[]).map(item=>({...item,city:"Copenhagen",country:"Denmark"})),
          ...(sto?.cafes||[]).map(item=>({...item,city:"Stockholm",country:"Sweden"}))
        ];
        setCatalog(combined);
        let next=Array.isArray(rev)?rev:[];
        const requested=new URLSearchParams(window.location.search).get("cafe");
        if(requested){
          const item=combined.find(c=>c.id===requested);
          const existing=next.find(r=>r.catalogId===requested || normalize(r.name)===normalize(item?.name||"") || (item?.aliases||[]).some(a=>normalize(a)===normalize(r.name)));
          if(existing)setSelectedId(existing.id);
          else if(item){const created=newCafe(item);next=[created,...next];setSelectedId(created.id);setStatus(`New review started from ${item.city} 50`)}
        }
        if(!selectedId&&!requested)setSelectedId(next?.[0]?.id||null);
        setCafes(next);
      }catch{setCafes([])}
    })();
    return()=>{cancelled=true};
  },[]);

  async function loginWith(value,show=true){
    setStatus("Checking…");
    try{const r=await fetch("/api/admin-check",{method:"POST",credentials:"same-origin",headers:{"x-admin-code":value,"x-remember-device":String(remember)}});if(!r.ok)throw new Error();setCode("");setReady(true);setStatus("")}
    catch{sessionStorage.removeItem("wtfika:admin");setReady(false);setStatus(show?"Wrong admin code":"")}
  }

  function patch(field,value){if(!selected)return;setCafes(list=>list.map(c=>c.id===selected.id?{...c,[field]:value}:c))}
  function nested(group,field,value){if(!selected)return;setCafes(list=>list.map(c=>c.id===selected.id?{...c,[group]:{...(c[group]||{}),[field]:value}}:c))}
  function rate(group,label,value){if(!selected)return;setCafes(list=>list.map(c=>c.id===selected.id?{...c,[group]:{...(c[group]||{}),ratings:{...(c[group]?.ratings||{}),[label]:value}}}:c))}

  function add(customCatalog){
    const c=newCafe(customCatalog);setCafes(list=>[c,...list]);setSelectedId(c.id);setTab("review");setStatus(customCatalog?"Shortlist café loaded":"New review ready");
  }

  function linkCatalog(catalogId){
    const item=catalog.find(c=>c.id===catalogId);if(!item)return;
    setCafes(list=>list.map(c=>c.id===selected.id?{...c,catalogId:item.id,name:item.name,address:item.address,city:item.city||"Copenhagen",country:item.country||"Denmark"}:c));
    setStatus(`Linked to ${item.city||"Copenhagen"} 50`);
  }

  async function publish(){
    setStatus("Publishing…");
    try{const r=await fetch(API,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({cafes})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"failed");setStatus("Published ✓");setTimeout(()=>setStatus(""),2500)}
    catch(e){if(e.message==="unauthorized")setReady(false);setStatus(e.message==="unauthorized"?"Session expired. Please sign in again.":"Publish failed")}
  }

  async function upload(event){
    const files=Array.from(event.target.files||[]).slice(0,6);event.target.value="";if(!files.length||!selected)return;
    setUploading(true);setStatus("Uploading photos…");const urls=[];
    try{for(const file of files){const form=new FormData();form.append("file",file);const r=await fetch("/api/images/upload",{method:"POST",credentials:"same-origin",body:form});const d=await r.json();if(!r.ok)throw new Error(d.error);urls.push(d.url)}patch("imgs",[...(selected.imgs||[]),...urls].slice(0,6));setStatus("Photos added · publish to save")}
    catch{setStatus("Photo upload failed")}
    finally{setUploading(false)}
  }

  if(checkingSession)return <main className="cv2-login"><p>Opening Creator Studio…</p></main>;
  if(!ready)return <main className="cv2-login"><form onSubmit={e=>{e.preventDefault();loginWith(code,true)}}>{mark()}<p className="cv2-eyebrow">Private creator studio</p><h1>Rate your next fika.</h1><p>Choose a café from the Copenhagen or Stockholm Top 50, or add your own. Upload photos, score the tasting and create the Instagram post.</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Admin code" aria-label="Admin code" name="password" autoComplete="current-password" autoFocus/><label className="cv2-remember"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>Remember this device for 90 days</label>{status&&<small>{status}</small>}<button>Open Creator Studio</button><a href="/">Back to public guide</a></form></main>;

  if(!selected)return <main className="cv2-empty">{mark()}<h1>No published reviews yet.</h1><p>Start with a researched Copenhagen or Stockholm café, or add a custom place.</p><div className="cv2-empty-actions"><button onClick={()=>add()}>+ Custom café</button>{catalog.slice(0,6).map(item=><button key={item.id} className="secondary-empty" onClick={()=>add(item)}>#{item.rank} · {item.name}</button>)}</div></main>;

  const photos=Array.isArray(selected.imgs)?selected.imgs:[];
  const cover=photos[0];
  const zoom=Number(selected.cardZoom)||1,x=Number(selected.cardX)||0,y=Number(selected.cardY)||0;

  return <main className="cv2-shell">
    <header className="cv2-header"><div>{mark()}<div><span>CREATOR STUDIO</span><h1>Worth the Fika</h1></div></div><nav><small>{status}</small><a href="/">Public guide</a><button onClick={async()=>{try{const r=await fetch("/api/admin-check",{method:"DELETE",credentials:"same-origin"});if(!r.ok)throw new Error();setCode("");setReady(false);setStatus("")}catch{setStatus("Could not log out. Please try again.")}}}>Log out</button><button className="primary" onClick={publish}>Publish all</button></nav></header>
    <div className="cv2-layout">
      <aside className="cv2-sidebar">
        <button className="new" onClick={()=>add()}>+ New custom café</button>
        <details className="quick-add"><summary>+ From Copenhagen 50</summary><div>{catalog.filter(item=>item.city==="Copenhagen"&&!cafes.some(r=>r.catalogId===item.id)).slice(0,50).map(item=><button key={item.id} onClick={()=>add(item)}><b>#{item.rank} {item.name}</b><span>{item.address}</span></button>)}</div></details>
        <details className="quick-add"><summary>+ From Stockholm 50</summary><div>{catalog.filter(item=>item.city==="Stockholm"&&!cafes.some(r=>r.catalogId===item.id)).slice(0,50).map(item=><button key={item.id} onClick={()=>add(item)}><b>#{item.rank} {item.name}</b><span>{item.address}</span></button>)}</div></details>
        <div className="review-list">{cafes.map(c=><button className={c.id===selected.id?"active":""} key={c.id} onClick={()=>{setSelectedId(c.id);setTab("review")}}><b>{c.name}</b><span>{c.city||"No city"} · {score(c)||"–"}/100</span></button>)}</div>
      </aside>
      <section className="cv2-content">
        <div className="cv2-title"><div><p>{selected.visitedOn||"Draft review"}</p><h2>{selected.name}</h2></div><strong>{score(selected)||"–"}<small>/100</small></strong></div>
        <div className="cv2-tabs"><button className={tab==="review"?"active":""} onClick={()=>setTab("review")}>1 · Review</button><button className={tab==="photos"?"active":""} onClick={()=>setTab("photos")}>2 · Photos ({photos.length})</button><button className={tab==="social"?"active":""} onClick={()=>setTab("social")}>3 · Instagram card</button></div>

        {tab==="review"&&<div className="cv2-card">
          <div className="section-head"><div><p className="cv2-eyebrow">The place</p><h3>Café details</h3></div><span>Link to the shortlist to get the right branch and map location.</span></div>
          <div className="cv2-fields">
            <label className="wide">Top 50 match<select value={selected.catalogId||""} onChange={e=>linkCatalog(e.target.value)}><option value="">Not linked / custom café</option>{catalog.map(item=><option key={item.id} value={item.id}>{item.city} #{item.rank} · {item.name}</option>)}</select></label>
            <label>Name<input value={selected.name||""} onChange={e=>patch("name",e.target.value)}/></label>
            <label>Address<input value={selected.address||""} onChange={e=>patch("address",e.target.value)}/></label>
            <label>City<input value={selected.city||""} onChange={e=>patch("city",e.target.value)}/></label>
            <label>Country<input value={selected.country||""} onChange={e=>patch("country",e.target.value)}/></label>
            <label>Date visited<input type="date" value={selected.visitedOn||""} onChange={e=>patch("visitedOn",e.target.value)}/></label>
            <label>Vibe<input value={selected.scene||""} onChange={e=>patch("scene",e.target.value)} placeholder="Warm bakery, sunny terrace…"/></label>
            <label className="wide">Best for<input value={(selected.bestFor||[]).join(", ")} onChange={e=>patch("bestFor",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))} placeholder="Cozy solo, Friends, Date, Laptop work"/></label>
          </div>

          <div className="section-head divided"><div><p className="cv2-eyebrow">The cup</p><h3>Drink</h3></div><span>0 means not tasted.</span></div>
          <div className="cv2-fields"><label>Drink<input value={selected.drink?.type||""} onChange={e=>nested("drink","type",e.target.value)} placeholder="Flat white"/></label><label>Detail<input value={selected.drink?.mod||""} onChange={e=>nested("drink","mod",e.target.value)} placeholder="Oat · single origin"/></label><label>Price<input type="number" value={selected.drink?.price||0} onChange={e=>nested("drink","price",Number(e.target.value))}/></label><label className="wide">Tasting note<textarea value={selected.drink?.note||""} onChange={e=>nested("drink","note",e.target.value)}/></label></div>
          <div className="cv2-ratings">{DRINK_CRITERIA.map(label=><RatingSlider key={label} label={label} value={selected.drink?.ratings?.[label]} onChange={v=>rate("drink",label,v)}/>)}</div>

          <div className="section-head divided"><div><p className="cv2-eyebrow">The bite</p><h3>Pastry</h3></div><span>0 means not tasted.</span></div>
          <div className="cv2-fields"><label>Pastry<input value={selected.pastry?.type||""} onChange={e=>nested("pastry","type",e.target.value)} placeholder="Cardamom bun"/></label><label>Detail<input value={selected.pastry?.subtype||""} onChange={e=>nested("pastry","subtype",e.target.value)}/></label><label>Price<input type="number" value={selected.pastry?.price||0} onChange={e=>nested("pastry","price",Number(e.target.value))}/></label><label className="wide">Tasting note<textarea value={selected.pastry?.note||""} onChange={e=>nested("pastry","note",e.target.value)}/></label></div>
          <div className="cv2-ratings">{PASTRY_CRITERIA.map(label=><RatingSlider key={label} label={label} value={selected.pastry?.ratings?.[label]} onChange={v=>rate("pastry",label,v)}/>)}</div>

          <div className="section-head divided"><div><p className="cv2-eyebrow">The whole fika</p><h3>Experience</h3></div></div>
          <div className="cv2-ratings"><RatingSlider label="Atmosphere" value={selected.atmosphere} onChange={v=>patch("atmosphere",v)}/><RatingSlider label="Service" value={selected.service} onChange={v=>patch("service",v)}/><RatingSlider label="Value" value={selected.value} onChange={v=>patch("value",v)}/></div>

          <div className="section-head divided"><div><p className="cv2-eyebrow">Your verdict</p><h3>What should people know?</h3></div></div>
          <div className="cv2-fields"><label className="wide">Short public take<textarea value={selected.take||""} onChange={e=>patch("take",e.target.value)} placeholder="The cardamom bun everyone whispers about. Believe them."/></label><label className="wide">Why it is worth the fika<textarea value={selected.reason||""} onChange={e=>patch("reason",e.target.value)}/></label></div>
        </div>}

        {tab==="photos"&&<div className="cv2-card">
          <div className="section-head"><div><p className="cv2-eyebrow">Your photos</p><h3>Upload from your phone</h3></div><span>The first photo is the cover.</span></div>
          <label className="cv2-upload"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={upload} disabled={uploading}/><b>{uploading?"Uploading…":"+ Add café photos"}</b><span>Up to 6 photos</span></label>
          <div className="cv2-photo-grid">{photos.map((url,i)=><figure key={url+i}><img src={url} alt=""/>{i===0&&<em>Cover</em>}<div>{i>0&&<button onClick={()=>{const copy=[...photos];const one=copy.splice(i,1)[0];copy.unshift(one);patch("imgs",copy)}}>Make cover</button>}<button onClick={()=>patch("imgs",photos.filter((_,idx)=>idx!==i))}>Remove</button></div></figure>)}</div>
        </div>}

        {tab==="social"&&<div className="cv2-card social-card-editor">
          <div className="section-head"><div><p className="cv2-eyebrow">Instagram</p><h3>Your finished Fika card</h3></div><span>Post is the default. Story uses the same visual language in 9:16.</span></div>
          <div className="format-toggle"><button className={format==="post"?"active":""} onClick={()=>setFormat("post")}>Post · 1080×1350</button><button className={format==="story"?"active":""} onClick={()=>setFormat("story")}>Story · 1080×1920</button></div>
          <div className="card-edit-grid">
            <div className={format==="story"?"ig-preview editorial story":"ig-preview editorial post"}>
              <div className="ig-image-wrap">
                {cover?<img src={cover} alt="" style={{transform:`translate(${x*.22}%,${y*.22}%) scale(${zoom})`}}/>:<div className="ig-fallback">{initials(selected.name)}</div>}
                <span className="ig-location">⌖ {selected.city}{selected.country?", "+selected.country:""}</span>
                {selected.scene&&<span className="ig-scene">☀ {selected.scene}</span>}
                <div className="ig-score"><strong>{score10(selected)}</strong><small>FIKA SCORE</small></div>
              </div>
              <div className="ig-paper">
                <span className="ig-kicker">WORTH THE FIKA</span>
                <h4>{selected.name}</h4>
                {score(selected)>=80&&<span className="ig-worth">✓ WORTH THE TRIP</span>}
                <div className="ig-tags">{(selected.bestFor||[]).slice(0,3).map(tag=><span key={tag}>{tag}</span>)}</div>
                <p className="ig-section-label">TASTING HIGHLIGHTS</p>
                {selected.drink?.type&&<div className="ig-taste-row"><span>☕</span><div><b>{selected.drink.type}</b><small>{selected.drink.note||selected.drink.mod}</small></div><strong>{category10(selected.drink)}</strong></div>}
                {selected.pastry?.type&&<div className="ig-taste-row"><span>🥐</span><div><b>{selected.pastry.type}</b><small>{selected.pastry.note||selected.pastry.subtype}</small></div><strong>{category10(selected.pastry)}</strong></div>}
                <p className="ig-verdict">{selected.reason||selected.take||"Add your verdict in the Review tab."}</p>
                <div className="ig-footer"><span>✦ FIKA REVIEWS</span><b>@WorthTheFika</b></div>
              </div>
            </div>
            <aside className="crop-controls">
              <h4>Frame the hero photo</h4>
              <p>Zoom in or out and move the image until the coffee, pastry or room sits exactly where you want it.</p>
              <label>Zoom in / out <b>{zoom.toFixed(2)}×</b><input type="range" min=".7" max="2.5" step=".05" value={zoom} onChange={e=>patch("cardZoom",Number(e.target.value))}/></label>
              <label>Move left / right <b>{x}</b><input type="range" min="-100" max="100" step="2" value={x} onChange={e=>patch("cardX",Number(e.target.value))}/></label>
              <label>Move up / down <b>{y}</b><input type="range" min="-100" max="100" step="2" value={y} onChange={e=>patch("cardY",Number(e.target.value))}/></label>
              <button className="reset-crop" onClick={()=>{patch("cardZoom",1);patch("cardX",0);patch("cardY",0)}}>Reset framing</button>
              <button className="download-card" onClick={async()=>{setStatus("Creating card…");try{await exportCard(selected,format);setStatus((format==="post"?"Post":"Story")+" downloaded ✓")}catch{setStatus("Card export failed")}}}>Download {format==="post"?"Instagram post":"Story"}</button>
            </aside>
          </div>
          <div className="caption-panel"><pre>{caption(selected)}</pre><button onClick={async()=>{await navigator.clipboard.writeText(caption(selected));setStatus("Caption copied ✓")}}>Copy caption</button></div>
        </div>}
        <footer className="cv2-footer"><span>Changes stay private until you press <b>Publish all</b>.</span><div><button onClick={()=>setTab(tab==="review"?"photos":tab==="photos"?"social":"review")}>{tab==="review"?"Next: photos":tab==="photos"?"Next: Instagram":"Back to review"}</button><button className="primary" onClick={publish}>Publish all</button></div></footer>
      </section>
    </div>
  </main>;
}
