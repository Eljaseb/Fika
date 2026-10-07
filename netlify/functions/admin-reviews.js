import {getStore} from '@netlify/blobs';
import {authorized} from '../lib/admin-session.mjs';
import {cleanCafe} from '../lib/cafe-data.mjs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const key=id=>'review/'+encodeURIComponent(String(id));
async function updatePublished(store,cafe,remove){
  for(let attempt=0;attempt<5;attempt++){
    const current=await store.getWithMetadata('cafes',{type:'json'});
    if(current&&!Array.isArray(current.data))throw new Error('Invalid published data');
    const list=current?.data||[],id=String(cafe.id);
    const next=remove?list.filter(c=>String(c.id)!==id):list.some(c=>String(c.id)===id)?list.map(c=>String(c.id)===id?cafe:c):[cafe,...list];
    const result=await store.setJSON('cafes',next,current?{onlyIfMatch:current.etag}:{onlyIfNew:true});
    if(result.modified)return;
  }
  throw new Error('Another change is being published. Please try again.');
}
export default async req=>{
  if(!authorized(req))return json({error:'unauthorized'},401);
  const drafts=getStore({name:'fika-drafts',consistency:'strong'}),publicStore=getStore({name:'fika',consistency:'strong'});
  try{
    if(req.method==='GET'){
      const published=await publicStore.get('cafes',{type:'json'})||[];
      if(!Array.isArray(published))throw new Error('Invalid published data');
      const {blobs}=await drafts.list({prefix:'review/'});
      const records=(await Promise.all(blobs.map(async b=>{const r=await drafts.getWithMetadata(b.key,{type:'json'});return r?{...r.data,etag:r.etag}:null}))).filter(Boolean);
      return json({published,drafts:records});
    }
    if(req.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await req.text();if(raw.length>50000)return json({error:'Review is too large'},413);
    let body;try{body=JSON.parse(raw)}catch{return json({error:'invalid_json'},400)}
    if(!['save','publish','remove','unpublish'].includes(body.action)||!body.cafe||!['string','number'].includes(typeof body.cafe.id)||String(body.cafe.id).length>150)return json({error:'bad_payload'},400);
    const cafe=cleanCafe(body.cafe),record={cafe,savedAt:new Date().toISOString(),deleted:body.action==='remove'};
    const result=await drafts.setJSON(key(cafe.id),record,body.etag?{onlyIfMatch:body.etag}:{onlyIfNew:true});
    if(!result.modified)return json({error:'This café changed on another device. Reload before saving.'},409);
    const response={ok:true,record:{...record,etag:result.etag}};
    if(body.action!=='save'){
      try{await updatePublished(publicStore,cafe,body.action!=='publish')}
      catch(e){return json({...response,ok:false,error:'Draft saved, but the public update failed. Please retry.',record:{...record,etag:result.etag}},503)}
    }
    return json(response);
  }catch{return json({error:'Could not load or save reviews. Please try again.'},500)}
};
export const config={path:'/api/admin-reviews'};
