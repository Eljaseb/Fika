import {authorized,equal,issue,cookie,sameOrigin} from "../lib/admin-session.mjs";
function reply(body,status=200,extra={}){return Response.json(body,{status,headers:{"cache-control":"no-store",...extra}})}
export default async(req)=>{
if(req.method==="GET"){const ok=authorized(req);return reply({ok},ok?200:401)}
if(req.method==="DELETE"){if(!sameOrigin(req))return reply({ok:false},403);return reply({ok:true},200,{"set-cookie":cookie("",0)})}
if(req.method!=="POST")return reply({ok:false},405);
if(!sameOrigin(req))return reply({ok:false},403);
const expected=Netlify.env.get("ADMIN_CODE");
if(!expected)return reply({ok:false},503);
if(!equal(req.headers.get("x-admin-code")||"",expected))return reply({ok:false},401);
const remember=req.headers.get("x-remember-device")==="true",session=issue(expected,remember);
return reply({ok:true},200,{"set-cookie":cookie(session.token,remember?session.seconds:undefined)});
};
export const config={path:"/api/admin-check"};
