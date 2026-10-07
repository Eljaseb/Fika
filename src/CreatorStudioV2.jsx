import {DRINKS,PASTRIES,TAGS,tagLabel,criterionLabel,foodEmoji,isCoffee,tastingMeta,ratingEmoji,reviewMonth,priceLabel,ratingEntries} from "./tasting.js";

import React, { useEffect, useMemo, useState, useRef } from "react";
import "./creator-v2.css";
import {gestureTransform} from "./photo-gesture.js";

const API = "/api/admin-reviews";
const DRINK_CRITERIA = ["Taste","Aroma","Body","Temperature","Balance"];
const PASTRY_CRITERIA = ["Flavour","Texture","Freshness","Filling","Presentation"];

function avg(values){const nums=values.map(Number).filter(n=>Number.isFinite(n)&&n>0);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0}
function score(cafe){const d=avg(ratingEntries(cafe?.drink).map(([,value])=>value));const p=avg(ratingEntries(cafe?.pastry).map(([,value])=>value));const s=avg([cafe?.atmosphere,cafe?.service,cafe?.value]);const h=avg([d,p].filter(Boolean));const total=h&&s?h*.72+s*.28:h||s||0;return total?Math.round(total*20):0}
function score10(cafe){const s=score(cafe);return s?(s/10).toFixed(1):"–"}
function category10(category){const s=avg(ratingEntries(category).map(([,value])=>value));return s?(s*2).toFixed(1):"–"}
function normalize(v=""){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function mark(){return <div className="cv2-mark" style={{background:"#f8f4eb",overflow:"hidden"}}><img src="/icons/fika-admin.svg" alt="Worth the Fika" style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}} /></div>}
function initials(name){return String(name||"Fika").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function blankRatings(list){return Object.fromEntries(list.map(x=>[x,0]))}

function newCafe(catalogCafe){
  return {
    id:crypto.randomUUID(),
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
  return <label className="cv2-rating"><span>{criterionLabel(label)}</span><input type="range" min="0" max="5" step=".5" value={n} onChange={e=>onChange(Number(e.target.value))}/><b>{n?n.toFixed(1):"–"}</b></label>;
}

function coverPlacement(bitmap,targetW,targetH,zoom=1,xShift=0,yShift=0){
  const baseScale=Math.max(targetW/bitmap.width,targetH/bitmap.height);
  const scale=baseScale*Math.max(.7,Number(zoom)||1);
  const dw=bitmap.width*scale,dh=bitmap.height*scale;
  const dx=(targetW-dw)/2 + (Number(xShift)||0)/100*targetW*.25;
  const dy=(targetH-dh)/2 + (Number(yShift)||0)/100*targetH*.25;
  return {dx,dy,dw,dh};
}

const bitmapCache=new Map();
async function loadBitmap(url){
  if(!url)return null;
  if(!bitmapCache.has(url))bitmapCache.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error();return r.blob()}).then(createImageBitmap).catch(()=>{bitmapCache.delete(url);return null}));
  return bitmapCache.get(url);
}
function wrap(ctx,text,maxWidth,maxLines){
  const words=String(text||"").split(/\s+/).filter(Boolean),lines=[];let line="";
  for(const word of words){const next=line?line+" "+word:word;if(ctx.measureText(next).width<=maxWidth||!line)line=next;else{lines.push(line);line=word}}
  if(line)lines.push(line);
  if(lines.length>maxLines){lines.length=maxLines;lines[maxLines-1]+="…"}
  return lines;
}
function drawEmojiBar(ctx,value,emoji,x,y,width,height){
  const amount=Math.max(0,Math.min(5,Number(value)||0));
  ctx.save();const trackH=height*.28,trackY=y+(height-trackH)/2;
  ctx.fillStyle="#e8dfd0";ctx.beginPath();ctx.roundRect(x,trackY,width,trackH,trackH/2);ctx.fill();
  if(amount){ctx.save();ctx.beginPath();ctx.roundRect(x,trackY,width,trackH,trackH/2);ctx.clip();ctx.fillStyle="#7f986a";ctx.fillRect(x,trackY,width*amount/5,trackH);ctx.restore()}
  const markerX=x+Math.max(height*.45,Math.min(width-height*.45,width*amount/5));
  ctx.font=`${height*.85}px "Apple Color Emoji","Segoe UI Emoji",Arial`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(emoji,markerX,y+height/2);

  ctx.restore();
}
async function renderCard(cafe,format,raw=false){
  const story=format==="story",W=1080,H=story?1920:1350,p=58,heroH=Math.round(H*(story?.45:.43));
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#fbf5e9";ctx.fillRect(0,0,W,H);
  const bitmap=await loadBitmap(cafe.imgs?.[0]);
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,heroH);ctx.clip();
  ctx.fillStyle="#adad8c";ctx.fillRect(0,0,W,heroH);
  if(bitmap){
    const place=coverPlacement(bitmap,W,heroH,cafe.cardZoom,cafe.cardX,cafe.cardY);
    ctx.translate(place.dx+place.dw/2,place.dy+place.dh/2);ctx.rotate((Number(cafe.cardRotation)||0)*Math.PI/180);ctx.drawImage(bitmap,-place.dw/2,-place.dh/2,place.dw,place.dh);
  }else{const g=ctx.createLinearGradient(0,0,W,heroH);g.addColorStop(0,"#d9b693");g.addColorStop(1,"#879477");ctx.fillStyle=g;ctx.fillRect(0,0,W,heroH);ctx.fillStyle="#432618";ctx.font="italic bold 190px Georgia";ctx.textAlign="center";ctx.fillText(initials(cafe.name),W/2,heroH*.55)}
  ctx.restore();ctx.textAlign="left";
  const shade=ctx.createLinearGradient(0,0,0,heroH);shade.addColorStop(0,"#211c1960");shade.addColorStop(.4,"#211c1900");shade.addColorStop(1,"#211c1930");ctx.fillStyle=shade;ctx.fillRect(0,0,W,heroH);
  function pill(text,x,y,bg,fg,size=24,max=500){ctx.font=`bold ${size}px Arial`;const label=wrap(ctx,text,max-36,1)[0]||"",width=Math.min(max,ctx.measureText(label).width+36);ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(x,y,width,48,24);ctx.fill();ctx.fillStyle=fg;ctx.fillText(label,x+18,y+32,width-36);return width}
  pill([cafe.city,cafe.country].filter(Boolean).join(", "),p,35,"#211c19bb","#fffaf2",24,560);
  const r=104,bx=W-p-r,by=heroH-r-26;
  ctx.fillStyle="#fffaf2";ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#bc914d";ctx.lineWidth=6;ctx.stroke();
  ctx.textAlign="center";ctx.fillStyle="#432618";ctx.font="bold 84px Georgia";ctx.fillText(cafe.itemCategory?category10(cafe.itemCategory):score10(cafe),bx,by+15);ctx.font="bold 20px Arial";ctx.fillText(cafe.itemCategory?(cafe.cardKind==="drink"?"DRINK / 10":"PASTRY / 10"):"FIKA SCORE",bx,by+55);ctx.textAlign="left";
  const bottom=H-118,available=bottom-heroH-36;
  // Fit typography at full card width; never shrink the whole text block into the centre.
  const drawBody=(scale,paint)=>{
    let y=heroH+50*scale;const text=(value,font,color,x,y,max)=>{ctx.font=font;ctx.fillStyle=color;if(paint)ctx.fillText(value,x,y,max)};
    text("WORTH THE FIKA",`bold ${24*scale}px Arial`,"#9c683d",p,y,W-p*2);y+= (story?94:84)*scale;
    ctx.font=`bold ${(story?100:88)*scale}px Georgia`;
    const titleText=cafe.itemCategory?foodEmoji(cafe.name,cafe.cardKind)+" "+cafe.name:cafe.name;
    let titleSize=(story?100:88)*scale;
    while(ctx.measureText(titleText).width>(W-p*2)*1.75&&titleSize>48*scale){titleSize-=4*scale;ctx.font=`bold ${titleSize}px Georgia`}
    const title=wrap(ctx,titleText,W-p*2,3);
    for(const line of title){text(line,ctx.font,"#2c211b",p,y,W-p*2);y+=(story?104:92)*scale}
    y-=25*scale;
    if(cafe.itemCategory){
      const item=cafe.itemCategory;
      text(cafe.cafeName,`bold ${32*scale}px Arial`,"#9c683d",p,y,W-p*2);y+=40*scale;
      text("🏷️ "+priceLabel(item.price,cafe.country),`bold ${30*scale}px Arial`,"#9c683d",p,y,W-p*2);y+=40*scale;
      const meta=tastingMeta(item);if(meta){text(meta,`${26*scale}px Arial`,"#72604e",p,y,W-p*2);y+=40*scale}
      text("TASTING DETAILS",`bold ${24*scale}px Arial`,"#9c683d",p,y,W-p*2);y+=18*scale;
      for(const [label,value] of ratingEntries(item)){
        y+=48*scale;text(criterionLabel(label),`bold ${32*scale}px Arial`,"#432618",p,y,W-p*2-360*scale);
        if(paint)drawEmojiBar(ctx,value,ratingEmoji(label),W-p-330*scale,y-34*scale,330*scale,44*scale);
      }
      if(item.note){y+=50*scale;ctx.font=`bold ${32*scale}px Georgia`;for(const line of wrap(ctx,item.note,W-p*2,story?4:3)){text(line,ctx.font,"#432618",p,y,W-p*2);y+=40*scale}}
      return y-heroH;
    }
    if(score(cafe)>=80){if(paint)pill("WORTH THE TRIP",p,y,"#5d744f","white",22*scale,320);y+=48+28*scale}
    const tags=(cafe.bestFor||[]).slice(0,3).map(tagLabel).join("  ·  ");
    if(tags){y+=22*scale;text(tags,`bold ${25*scale}px Arial`,"#80634c",p,y,W-p*2);y+=26*scale}
    y+=22*scale;
    if(cafe.drink?.type||cafe.pastry?.type){text("THE TASTING",`bold ${23*scale}px Arial`,"#9c683d",p,y,W-p*2);y+=22*scale}
    for(const [label,category] of [["COFFEE",cafe.drink],["PASTRY",cafe.pastry]]){
      if(!category?.type)continue;
      y+=48*scale;
      const scoreWidth=150*scale,priceWidth=190*scale,gap=24*scale;
      const nameWidth=W-p*2-scoreWidth-priceWidth-gap*2;
      const nameFont=`bold ${38*scale}px Georgia`;ctx.font=nameFont;
      const lines=wrap(ctx,foodEmoji(category.type,label==="PASTRY"?"pastry":"drink")+" "+category.type,nameWidth,3);
      lines.forEach((line,i)=>text(line,nameFont,"#2c211b",p,y+i*46*scale,nameWidth));
      if(paint)ctx.textAlign="right";
      text(priceLabel(category.price,cafe.country),`bold ${26*scale}px Arial`,"#72604e",W-p-scoreWidth-gap,y,priceWidth);
      text(category10(category)+"/10",`bold ${34*scale}px Georgia`,"#a65d40",W-p,y,scoreWidth);
      if(paint)ctx.textAlign="left";
      y+=(lines.length-1)*46*scale+30*scale;
      if(paint){ctx.strokeStyle="#ddcdb7";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p,y);ctx.lineTo(W-p,y);ctx.stroke()}
    }
    const verdict=cafe.reason||cafe.take;
    if(verdict){y+=46*scale;ctx.font=`bold ${(story?38:34)*scale}px Georgia`;for(const line of wrap(ctx,verdict,W-p*2,story?4:3)){text(line,ctx.font,"#432618",p,y,W-p*2);y+=(story?47:42)*scale}}
    return y-heroH;
  };
  let scale=story?1.22:1;for(let i=0;i<6;i++){const used=drawBody(scale,false);if(used<=available)break;scale*=available/used*.98}
  drawBody(scale,true);
  ctx.strokeStyle="#c9b492";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p,H-100);ctx.lineTo(W-p,H-100);ctx.stroke();ctx.fillStyle="#80603c";ctx.font="bold 24px Arial";ctx.fillText(reviewMonth(cafe.visitedOn)?"FIKA · "+reviewMonth(cafe.visitedOn):"FIKA REVIEWS",p,H-52);ctx.textAlign="right";ctx.fillText("@WorthTheFika",W-p,H-52);ctx.textAlign="left";
  if(raw)return canvas;
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.95));if(!blob)throw new Error("card_failed");return blob;
}
function caption(cafe){
  if(cafe.itemCategory)return [cafe.name+" · "+cafe.cafeName,"Score: "+category10(cafe.itemCategory)+"/10",tastingMeta(cafe.itemCategory),cafe.itemCategory.note||"",...ratingEntries(cafe.itemCategory).map(([label,v])=>criterionLabel(label)+": "+(Number(v)>0?v+"/5":"Not rated")),"#WorthTheFika #Fika"].join("\n");
  const tags=(cafe.bestFor||[]).slice(0,4).map(x=>"#"+String(x).replace(/[^a-z0-9]+/gi,"")).filter(Boolean).join(" ");
  return [cafe.name+" · "+(cafe.city||""),"Worth the Fika score: "+score(cafe)+"/100",cafe.take||cafe.reason||"",cafe.drink?.type?"☕ "+cafe.drink.type:"",cafe.pastry?.type?"🥐 "+cafe.pastry.type:"","",tags+" #WorthTheFika #Fika"].join("\n");
}

function TypePicker({kind,value,onChange}){
  const options=kind==="drink"?DRINKS:PASTRIES;
  const match=options.find(x=>x.toLowerCase()===value.toLowerCase());
  const [custom,setCustom]=useState(Boolean(value&&!match));
  return <><label>{kind==="drink"?"Drink type":"Pastry type"}<select value={custom?"custom":match||""} onChange={e=>{setCustom(e.target.value==="custom");onChange(e.target.value==="custom"?"":e.target.value)}}><option value="">Choose a {kind}</option>{options.map(o=><option key={o}>{o}</option>)}<option value="custom">＋ Other / custom {kind}</option></select></label>{custom&&<label>Custom {kind} name<input value={value} onChange={e=>onChange(e.target.value)} placeholder={kind==="drink"?"Your own drink":"Your own pastry"}/></label>}</>;
}
function CategoryPhoto({kind,category,uploading,onUpload,onRemove}){
  return <div className="cv2-category-photo">{category?.photo&&<img src={category.photo} alt={kind+" photo"}/>}<div><b>{foodEmoji(category?.type,kind)} {kind==="drink"?"Drink":"Pastry"} card photo</b><label><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={uploading} onChange={onUpload}/>{uploading?"Uploading…":"Choose a photo"}</label>{category?.photo&&<button disabled={uploading} onClick={onRemove}>Remove photo</button>}</div></div>;
}

function CardPreview({cafe,format,onTransform,onStatus}){
  const canvasRef=useRef(null),pointers=useRef(new Map()),start=useRef(null),latest=useRef(cafe);
  const [prepared,setPrepared]=useState(null),[error,setError]=useState(false);
  latest.current=cafe;
  const fingerprint=JSON.stringify([cafe,format]);
  useEffect(()=>{
    let cancelled=false;setError(false);
    renderCard(cafe,format,true).then(canvas=>{
      if(cancelled)return;
      const target=canvasRef.current;target.width=canvas.width;target.height=canvas.height;target.getContext("2d").drawImage(canvas,0,0);
      canvas.toBlob(blob=>{if(!cancelled&&blob)setPrepared({blob,fingerprint})},"image/jpeg",.95);
    }).catch(()=>{if(!cancelled)setError(true)});
    return()=>{cancelled=true};
  },[cafe,format]);
  function base(el){const box=el.getBoundingClientRect();start.current={points:[...pointers.current.values()],box,transform:{cardZoom:Number(latest.current.cardZoom)||1,cardX:Number(latest.current.cardX)||0,cardY:Number(latest.current.cardY)||0,cardRotation:Number(latest.current.cardRotation)||0}}}
  function point(e){const r=e.currentTarget.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
  function down(e){if(!cafe.imgs?.[0]||pointers.current.size>=2)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,point(e));base(e.currentTarget)}
  function move(e){if(!pointers.current.has(e.pointerId))return;e.preventDefault();pointers.current.set(e.pointerId,point(e));const next=gestureTransform(start.current,[...pointers.current.values()],start.current.box);latest.current={...latest.current,...next};onTransform(next)}
  function up(e){pointers.current.delete(e.pointerId);if(pointers.current.size)base(e.currentTarget);else start.current=null}
  function download(){
    if(!prepared||prepared.fingerprint!==fingerprint)return;
    const name=(cafe.name||"fika").toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+format+".jpg";
    const file=new File([prepared.blob],name,{type:"image/jpeg"});
    if(navigator.canShare?.({files:[file]})&&navigator.share){
      navigator.share({files:[file],title:cafe.name}).then(()=>onStatus("Card shared · choose Save Image to keep it in Photos")).catch(e=>{if(e.name!=="AbortError")onStatus("Sharing could not open. Use Save JPEG below.")});
    }else saveJPEG();
  }
  function saveJPEG(){if(!prepared||prepared.fingerprint!==fingerprint)return;const u=URL.createObjectURL(prepared.blob),a=document.createElement("a");a.href=u;a.download=(cafe.name||"fika").toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+format+".jpg";a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);onStatus("JPEG downloaded. On iPhone, use Share → Save Image to add it to Photos.")}
  return <div className="cv2-direct-card"><div className={"cv2-touch-preview "+format}>
    <canvas ref={canvasRef} className="cv2-card-canvas" aria-label={"Instagram card for "+cafe.name}/>
    {cafe.imgs?.[0]&&<div className="cv2-photo-touch" style={{height:format==="story"?"45%":"43%"}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} aria-label="Drag photo; use two fingers to zoom and rotate"/>}
  </div>
  {error&&<p role="alert">The preview could not load. Please try again.</p>}
  <p className="cv2-gesture-hint">{cafe.imgs?.[0]?"Drag the photo. Use two fingers to zoom and rotate.":"Add a cover photo in Photos to create your card."}</p>
  {cafe.imgs?.[0]&&<div className="cv2-inline-photo-actions"><button onClick={()=>onTransform({cardZoom:1,cardX:0,cardY:0,cardRotation:0})}>Reset photo</button><button aria-label="Zoom photo out" onClick={()=>onTransform({cardZoom:Math.max(.7,(Number(cafe.cardZoom)||1)-.1)})}>−</button><button aria-label="Zoom photo in" onClick={()=>onTransform({cardZoom:Math.min(5,(Number(cafe.cardZoom)||1)+.1)})}>＋</button><button aria-label="Rotate photo 90 degrees" onClick={()=>onTransform({cardRotation:((Number(cafe.cardRotation)||0)+90)%360})}>↻</button></div>}
  <button className="download-card" disabled={!prepared||prepared.fingerprint!==fingerprint} onClick={download}>Download the card</button>
  <p className="cv2-export-hint">High-quality JPEG · {format==="story"?"1080 × 1920":"1080 × 1350"}. On iPhone, choose Save Image in the share sheet.</p>
  <button className="cv2-file-fallback" disabled={!prepared||prepared.fingerprint!==fingerprint} onClick={saveJPEG}>Save JPEG to Files instead</button>
  </div>;
}

export default function CreatorStudioV2(){
  const [cafes,setCafes]=useState([]);
  const [catalog,setCatalog]=useState([]);
  const [view,setView]=useState("library");
  const [search,setSearch]=useState("");
  const [city,setCity]=useState("Copenhagen");
  const [loaded,setLoaded]=useState(false);
  const [loadError,setLoadError]=useState(false);
  const [saved,setSaved]=useState({});
  const [published,setPublished]=useState({});
  const [versions,setVersions]=useState({});
  const [publishing,setPublishing]=useState(false);
  const [undo,setUndo]=useState(null);
  const dirty=loaded&&cafes.some(c=>JSON.stringify(c)!==saved[c.id]);
  useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue=""};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[dirty]);
  const [selectedId,setSelectedId]=useState(null);
  const [code,setCode]=useState("");
  const [ready,setReady]=useState(false);
  const [remember,setRemember]=useState(true);
  const [checkingSession,setCheckingSession]=useState(true);
  const [tab,setTab]=useState("review");
  const [status,setStatus]=useState("");
  const [uploading,setUploading]=useState(false);
  const [format,setFormat]=useState("post");
  const [cardKind,setCardKind]=useState("cafe");
  const selected=useMemo(()=>cafes.find(c=>String(c.id)===String(selectedId))||cafes[0],[cafes,selectedId]);

  const cardCafe=useMemo(()=>{
    if(!selected||cardKind==="cafe")return selected;
    const item=selected[cardKind]||{};
    return {...selected,name:item.type||cardKind,cafeName:selected.name,cardKind,itemCategory:item,imgs:item.photo?[item.photo]:[],cardZoom:item.cardZoom||1,cardX:item.cardX||0,cardY:item.cardY||0,cardRotation:item.cardRotation||0};
  },[selected,cardKind]);
  useEffect(()=>{let cancelled=false;sessionStorage.removeItem("wtfika:admin");fetch("/api/admin-check",{credentials:"same-origin",cache:"no-store"}).then(r=>{if(!cancelled)setReady(r.ok)}).catch(()=>{}).finally(()=>{if(!cancelled)setCheckingSession(false)});return()=>{cancelled=true}},[]);

  useEffect(()=>{
    if(!ready)return;
    let cancelled=false;
    (async()=>{
      try{
        const [revRes,cphRes,stoRes]=await Promise.all([fetch(API,{credentials:"same-origin",cache:"no-store"}),fetch("/copenhagen50.json"),fetch("/stockholm50.json")]);
        if(!revRes.ok||!cphRes.ok||!stoRes.ok)throw new Error("load_failed");
        const data=await revRes.json();
        if(!Array.isArray(data.published)||!Array.isArray(data.drafts))throw new Error("bad_reviews");
        const publicMap=Object.fromEntries(data.published.map(c=>[c.id,c]));
        const merged={...publicMap},versionMap={};
        for(const r of data.drafts){versionMap[r.cafe.id]=r.etag;if(!r.deleted)merged[r.cafe.id]=r.cafe}
        const rev=Object.values(merged);
        setPublished(publicMap);setVersions(versionMap);setSaved(Object.fromEntries(rev.map(c=>[c.id,JSON.stringify(c)])));
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
          setView("editor");
          const item=combined.find(c=>c.id===requested);
          const existing=next.find(r=>r.catalogId===requested || normalize(r.name)===normalize(item?.name||"") || (item?.aliases||[]).some(a=>normalize(a)===normalize(r.name)));
          if(existing)setSelectedId(existing.id);
          else if(item){const created=newCafe(item);next=[created,...next];setSelectedId(created.id);setStatus(`New review started from ${item.city} 50`)}
        }
        if(!selectedId&&!requested)setSelectedId(next?.[0]?.id||null);
        setCafes(next);setLoaded(true);
      }catch{setLoadError(true)}
    })();
    return()=>{cancelled=true};
  },[ready]);

  async function loginWith(value,show=true){
    setStatus("Checking…");
    try{const r=await fetch("/api/admin-check",{method:"POST",credentials:"same-origin",headers:{"x-admin-code":value,"x-remember-device":String(remember)}});if(!r.ok)throw new Error();setCode("");setReady(true);setStatus("")}
    catch{sessionStorage.removeItem("wtfika:admin");setReady(false);setStatus(show?"Wrong admin code":"")}
  }

  function patch(field,value){if(!selected)return;setCafes(list=>list.map(c=>c.id===selected.id?{...c,[field]:value}:c))}
  function nested(group,field,value){if(!selected)return;setCafes(list=>list.map(c=>c.id===selected.id?{...c,[group]:{...(c[group]||{}),[field]:value}}:c))}
  function rate(group,label,value){if(!selected)return;setCafes(list=>list.map(c=>c.id===selected.id?{...c,[group]:{...(c[group]||{}),ratings:{...(c[group]?.ratings||{}),[label]:value}}}:c))}

  function add(customCatalog){
    if(customCatalog){const existing=cafes.find(c=>c.catalogId===customCatalog.id||normalize(c.name)===normalize(customCatalog.name));if(existing){openReview(existing);return}}
    setCardKind("cafe");setView("editor");setSearch("");const c=newCafe(customCatalog);setCafes(list=>[c,...list]);setSelectedId(c.id);setTab("review");setStatus(customCatalog?"Shortlist café loaded":"New review ready");
  }

  function openReview(c){setCardKind("cafe");setSelectedId(c.id);setTab("review");setView("editor");window.scrollTo(0,0)}
  async function manageReview(action){
    if(action==="remove"){
      if(!window.confirm(`Remove ${selected.name} and its saved draft? This also removes its published review. The Top 50 listing stays.`))return;
      if(await persist("remove")){setCafes(list=>list.filter(c=>c.id!==selected.id));setSelectedId(null);setView("library");setUndo(null)}
      return;
    }
    if(!window.confirm(`Reset ratings, notes and photos for ${selected.name}? Café details stay. The published version stays unchanged until you publish.`))return;
    setUndo(cafes);const blank=newCafe();setCafes(list=>list.map(c=>c.id===selected.id?{...c,drink:blank.drink,pastry:blank.pastry,atmosphere:0,service:0,value:0,bestFor:[],take:"",reason:"",scene:"",visitedOn:"",imgs:[],cardZoom:1,cardX:0,cardY:0,cardRotation:0}:c));setTab("review");setStatus("Review reset locally · save the draft when ready");
  }
  function linkCatalog(catalogId){
    if(!catalogId){patch("catalogId","");return}
    const item=catalog.find(c=>c.id===catalogId);if(!item)return;
    setCafes(list=>list.map(c=>c.id===selected.id?{...c,catalogId:item.id,name:item.name,address:item.address,city:item.city||"Copenhagen",country:item.country||"Denmark"}:c));
    setStatus(`Linked to ${item.city||"Copenhagen"} 50`);
  }

  function reviewState(c){if(!published[c.id])return "Draft";return JSON.stringify(c)===JSON.stringify(published[c.id])?"Published":"Unpublished changes"}
  async function persist(action){
    if(!selected||!loaded||publishing||uploading)return false;
    const cafe=structuredClone(selected),snapshot=JSON.stringify(cafe);setPublishing(true);setStatus(action==="save"?"Saving draft…":action==="publish"?"Publishing this café…":"Updating café…");
    try{
      const r=await fetch(API,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({action,cafe,etag:versions[cafe.id]||null})});
      const d=await r.json();
      if(d.record){setVersions(v=>({...v,[cafe.id]:d.record.etag}));setSaved(v=>({...v,[cafe.id]:JSON.stringify(d.record.cafe)}));setCafes(list=>list.map(c=>c.id===cafe.id&&JSON.stringify(c)===snapshot?d.record.cafe:c))}
      if(!r.ok)throw new Error(d.error||"Could not save this café");
      if(action==="publish")setPublished(v=>({...v,[cafe.id]:d.record.cafe}));
      if(action==="remove"||action==="unpublish")setPublished(v=>{const next={...v};delete next[cafe.id];return next});
      setUndo(null);setStatus(action==="save"?"Draft saved privately ✓":action==="publish"?"This café is now published ✓":action==="unpublish"?"Unpublished · private draft kept":"Review removed");return true;
    }catch(e){if(e.message==="unauthorized")setReady(false);setStatus(e.message==="unauthorized"?"Please sign in again. Your inputs are still here.":e.message);return false}finally{setPublishing(false)}
  }
  async function uploadCategory(event,kind){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    setUploading(true);setStatus("Uploading "+kind+" photo…");
    try{const form=new FormData();form.append("file",file);const r=await fetch("/api/images/upload",{method:"POST",credentials:"same-origin",body:form});const d=await r.json();if(!r.ok)throw new Error(d.error);setCafes(list=>list.map(c=>c.id===selected.id?{...c,[kind]:{...(c[kind]||{}),photo:d.url,cardZoom:1,cardX:0,cardY:0,cardRotation:0}}:c));setStatus("Photo added · save draft to keep it")}catch{setStatus("Photo upload failed. Please try again.")}finally{setUploading(false)}
  }
  async function upload(event){
    const files=Array.from(event.target.files||[]).slice(0,6);event.target.value="";if(!files.length||!selected)return;
    setUploading(true);setStatus("Uploading photos…");const urls=[];
    try{for(const file of files){const form=new FormData();form.append("file",file);const r=await fetch("/api/images/upload",{method:"POST",credentials:"same-origin",body:form});const d=await r.json();if(!r.ok)throw new Error(d.error);urls.push(d.url)}patch("imgs",[...(selected.imgs||[]),...urls].slice(0,6));setStatus("Photos added · save draft to keep them")}
    catch{setStatus("Photo upload failed")}
    finally{setUploading(false)}
  }

  if(checkingSession)return <main className="cv2-login"><p>Opening Creator Studio…</p></main>;
  if(!ready)return <main className="cv2-login"><form onSubmit={e=>{e.preventDefault();loginWith(code,true)}}>{mark()}<p className="cv2-eyebrow">Private creator studio</p><h1>Rate your next fika.</h1><p>Choose a café from the Copenhagen or Stockholm Top 50, or add your own. Upload photos, score the tasting and create the Instagram post.</p><input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Admin code" aria-label="Admin code" name="password" autoComplete="current-password" autoFocus/><label className="cv2-remember"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>Remember this device for 90 days</label>{status&&<small>{status}</small>}<button>Open Creator Studio</button><a href="/">Back to public guide</a></form></main>;

  if(loadError)return <main className="cv2-empty"><h1>Could not load your reviews.</h1><p>Please reload before editing so your saved reviews stay safe.</p><button onClick={()=>window.location.reload()}>Try again</button></main>;
  if(!loaded)return <main className="cv2-empty"><p>Loading your reviews…</p></main>;

  const photos=Array.isArray(selected?.imgs)?selected.imgs:[];
  const cover=photos[0];
  const zoom=Number(selected?.cardZoom)||1,x=Number(selected?.cardX)||0,y=Number(selected?.cardY)||0;

  return <main className="cv2-shell">
    <header className="cv2-header"><div>{mark()}<div><span>CREATOR STUDIO</span><h1>Worth the Fika</h1></div></div><nav><small>{status}</small><a href="/">Public guide</a><button onClick={async()=>{try{const r=await fetch("/api/admin-check",{method:"DELETE",credentials:"same-origin"});if(!r.ok)throw new Error();setCode("");setReady(false);setStatus("")}catch{setStatus("Could not log out. Please try again.")}}}>Log out</button></nav></header>
    <div className="cv2-notice" role="status"><span>{status|| (dirty?"Unsaved inputs · open each café to save its draft":"Drafts saved · publish each café when ready")}</span>{undo&&<button onClick={()=>{setCafes(undo);setUndo(null);setStatus("Change undone")}}>Undo</button>}</div>
    {view!=="editor"?<section className="cv2-library">
      <div className="cv2-library-heading"><div><p className="cv2-eyebrow">Your café journal</p><h2>{view==="add"?"Add a café":"My reviews"}</h2><p>{cafes.length} cafés · open a review to edit, add photos or create an Instagram card.</p></div><button className="primary" onClick={()=>{setView(view==="add"?"library":"add");setSearch("")}}>{view==="add"?"← My reviews":"+ Add café"}</button></div>
      {view==="add"&&<div className="cv2-add-options"><button onClick={()=>add()}><b>＋ A café outside the Top 50</b><span>Start with a name and add your own details.</span></button><h3>Choose from the Top 50</h3><div className="format-toggle">{["Copenhagen","Stockholm"].map(c=><button key={c} className={city===c?"active":""} onClick={()=>setCity(c)}>{c}</button>)}</div></div>}
      <input className="cv2-search" type="search" aria-label="Search cafés" placeholder={view==="add"?"Search the Top 50…":"Search your reviews…"} value={search} onChange={e=>setSearch(e.target.value)}/>
      <div className="cv2-review-grid">{(view==="add"?catalog.filter(c=>c.city===city):cafes).filter(c=>normalize(c.name+" "+c.city).includes(normalize(search))).map(c=>{
        const existing=view==="add"?cafes.find(r=>r.catalogId===c.id||normalize(r.name)===normalize(c.name)):c;
        return <button className="cv2-review-tile" key={c.id} onClick={()=>existing?openReview(existing):add(c)}><div className="cv2-tile-photo">{existing?.imgs?.[0]?<img src={existing.imgs[0]} alt=""/>:<span>{initials(c.name)}</span>}<em>{existing?`${score(existing)||"–"}/100`:`#${c.rank}`}</em></div><div className="cv2-tile-copy"><h3>{c.name}</h3><p>{c.city} · {existing?`${existing.imgs?.length||0} photos`:c.address}</p>{existing&&<p className="cv2-review-state">{reviewState(existing)}{JSON.stringify(existing)!==saved[existing.id]?" · Unsaved":""}</p>}{existing&&<p className="cv2-tile-verdict">{existing.take||existing.reason||"Add your tasting notes and verdict"}</p>}<strong>{existing?"Open review →":"Start review +"}</strong></div></button>
      })}</div>
      {view==="library"&&!cafes.length&&<div className="cv2-card"><h3>Your first fika starts here.</h3><p>Tap Add café to choose a Top 50 café or add your own discovery.</p></div>}
      {search&&!(view==="add"?catalog.filter(c=>c.city===city):cafes).some(c=>normalize(c.name+" "+c.city).includes(normalize(search)))&&<p>No cafés match your search.</p>}
    </section>:selected&&<div className="cv2-layout">
      <section className="cv2-content">
        <button className="cv2-back" onClick={()=>{setView("library");setSearch("")}}>← My reviews</button>
        <div className="cv2-savebar"><div><b>{reviewState(selected)}</b><small>{JSON.stringify(selected)===saved[selected.id]?"Saved":"Unsaved inputs"}</small></div><button disabled={publishing||uploading} onClick={()=>persist("save")}>Save draft</button><button className="primary" disabled={publishing||uploading} onClick={()=>persist("publish")}>Publish café</button></div>
        <div className="cv2-title"><div><p>{selected.visitedOn||"Draft review"}</p><h2>{selected.name}</h2></div><strong>{score(selected)||"–"}<small>/100</small></strong></div>
        <div className="cv2-review-summary">{cover?<img src={cover} alt={selected.name}/>:<button onClick={()=>setTab("photos")}>＋ Add a cover photo</button>}<div><p>{selected.city} · {selected.catalogId?"Top 50 café":"Your discovery"}</p><p>{selected.take||selected.reason||"Add your verdict to bring this review to life."}</p><div className="cv2-summary-scores"><span>Drink <b>{category10(selected.drink)}/10</b></span><span>Pastry <b>{category10(selected.pastry)}/10</b></span></div></div></div>
        <details className="cv2-manage"><summary>Manage this review</summary><p>Reset clears the draft’s ratings, notes and photos. Remove deletes the draft and published review. Unpublish keeps a private draft.</p><button onClick={()=>manageReview("reset")}>Reset review data</button><button disabled={publishing} onClick={()=>manageReview("remove")}>Remove review</button>{published[selected.id]&&<button disabled={publishing} onClick={()=>{if(window.confirm("Remove this review from the public guide and keep it as a private draft?"))persist("unpublish")}}>Unpublish café</button>}</details>
        <div className="cv2-tabs"><button className={tab==="review"?"active":""} onClick={()=>setTab("review")}>1 · Review</button><button className={tab==="photos"?"active":""} onClick={()=>setTab("photos")}>2 · Photos ({photos.length})</button><button className={tab==="social"?"active":""} onClick={()=>setTab("social")}>3 · Instagram</button></div>

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

          <div className="cv2-tag-picks">{TAGS.map(tag=><button key={tag} aria-pressed={(selected.bestFor||[]).includes(tag)} onClick={()=>patch("bestFor",(selected.bestFor||[]).includes(tag)?selected.bestFor.filter(t=>t!==tag):[...(selected.bestFor||[]),tag])}>{tagLabel(tag)}</button>)}</div>
          <div className="section-head divided"><div><p className="cv2-eyebrow">The cup</p><h3>Drink</h3></div><span>0 means not tasted.</span></div>
          <div className="cv2-fields"><TypePicker key={selected.id+"drink"} kind="drink" value={selected.drink?.type||""} onChange={v=>{nested("drink","type",v);if(!isCoffee(v))nested("drink","shots","")}}/><label>Detail<input value={selected.drink?.mod||""} onChange={e=>nested("drink","mod",e.target.value)} placeholder="Oat · single origin"/></label><label>Price<input type="number" value={selected.drink?.price||0} onChange={e=>nested("drink","price",Number(e.target.value))}/></label><label className="wide">Tasting note<textarea value={selected.drink?.note||""} onChange={e=>nested("drink","note",e.target.value)}/></label></div>
          <div className="cv2-fields">{isCoffee(selected.drink?.type)&&<label>Espresso shots<select value={selected.drink?.shots||""} onChange={e=>nested("drink","shots",e.target.value)}><option value="">Not specified / not applicable</option><option value="1">Single shot</option><option value="2">Double shot</option><option value="3">Triple shot</option></select></label>}<label>Serving<select value={selected.drink?.temp||""} onChange={e=>nested("drink","temp",e.target.value)}><option value="">Not specified</option><option>Hot</option><option>Iced</option><option>Cold</option></select></label></div>
          <CategoryPhoto kind="drink" category={selected.drink} uploading={uploading} onUpload={e=>uploadCategory(e,"drink")} onRemove={()=>nested("drink","photo","")}/>
          <div className="cv2-ratings">{DRINK_CRITERIA.map(label=><RatingSlider key={label} label={label} value={selected.drink?.ratings?.[label]} onChange={v=>rate("drink",label,v)}/>)}</div>

          <div className="section-head divided"><div><p className="cv2-eyebrow">The bite</p><h3>Pastry</h3></div><span>0 means not tasted.</span></div>
          <div className="cv2-fields"><TypePicker key={selected.id+"pastry"} kind="pastry" value={selected.pastry?.type||""} onChange={v=>nested("pastry","type",v)}/><label>Detail<input value={selected.pastry?.subtype||""} onChange={e=>nested("pastry","subtype",e.target.value)}/></label><label>Price<input type="number" value={selected.pastry?.price||0} onChange={e=>nested("pastry","price",Number(e.target.value))}/></label><label className="wide">Tasting note<textarea value={selected.pastry?.note||""} onChange={e=>nested("pastry","note",e.target.value)}/></label></div>
          <CategoryPhoto kind="pastry" category={selected.pastry} uploading={uploading} onUpload={e=>uploadCategory(e,"pastry")} onRemove={()=>nested("pastry","photo","")}/>
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
          <div className="section-head"><div><p className="cv2-eyebrow">Instagram</p><h3>Your finished Fika card</h3></div><span>Choose a format, frame your photo with your fingers, then download your card.</span></div>
          <div className="format-toggle card-kind">{[["cafe","🏡 Café card"],["drink","☕ Drink card"],["pastry","🥐 Pastry card"]].map(([kind,label])=><button key={kind} className={cardKind===kind?"active":""} disabled={kind!=="cafe"&&!selected[kind]?.type} onClick={()=>setCardKind(kind)}>{label}</button>)}</div>
          {cardKind!=="cafe"&&<CategoryPhoto kind={cardKind} category={selected[cardKind]} uploading={uploading} onUpload={e=>uploadCategory(e,cardKind)} onRemove={()=>nested(cardKind,"photo","")}/>}
          <div className="format-toggle"><button className={format==="post"?"active":""} onClick={()=>setFormat("post")}>Post · 1080×1350</button><button className={format==="story"?"active":""} onClick={()=>setFormat("story")}>Story · 1080×1920</button></div>
          <div className="card-edit-grid">
            <CardPreview key={selected.id+cardKind} cafe={cardCafe} format={format} onStatus={setStatus} onTransform={values=>setCafes(list=>list.map(c=>c.id===selected.id?(cardKind==="cafe"?{...c,...values}:{...c,[cardKind]:{...(c[cardKind]||{}),...values}}):c))}/>
          </div>
          <div className="caption-panel"><pre>{caption(cardCafe)}</pre><button onClick={async()=>{await navigator.clipboard.writeText(caption(cardCafe));setStatus("Caption copied ✓")}}>Copy caption</button></div>
        </div>}
        <footer className="cv2-footer"><span><b>Save draft</b> keeps this café private. <b>Publish café</b> updates only this review.</span><div><button onClick={()=>setTab(tab==="review"?"photos":tab==="photos"?"social":"review")}>{tab==="review"?"Next: photos":tab==="photos"?"Next: Instagram":"Back to review"}</button><button disabled={publishing||uploading} onClick={()=>persist("save")}>Save draft</button><button className="primary" disabled={publishing||uploading} onClick={()=>persist("publish")}>Publish café</button></div></footer>
      </section>
    </div>}
  </main>;
}

