import {createHmac,timingSafeEqual,randomBytes} from "node:crypto";
export const COOKIE="__Host-fika-admin";
export function equal(a,b){if(typeof a!=="string"||typeof b!=="string")return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
function sign(p,s){return createHmac("sha256",s).update("fika-admin-v1:"+p).digest("base64url")}
export function issue(secret,remember,now=Date.now()){const seconds=remember?90*86400:12*3600;const p=Buffer.from(JSON.stringify({exp:Math.floor(now/1000)+seconds,nonce:randomBytes(16).toString("hex")})).toString("base64url");return {token:p+"."+sign(p,secret),seconds}}
export function valid(token,secret,now=Date.now()){if(!secret||!token||token.length>1024)return false;const [p,s,extra]=token.split(".");if(extra||!p||!s||!equal(s,sign(p,secret)))return false;try{const d=JSON.parse(Buffer.from(p,"base64url"));return Number.isSafeInteger(d.exp)&&d.exp>Math.floor(now/1000)}catch{return false}}
export function sameOrigin(req){return req.headers.get("origin")===new URL(req.url).origin}
export function cookie(token,maxAge){return COOKIE+"="+token+"; Path=/; HttpOnly; Secure; SameSite=Strict"+(maxAge===undefined?"":"; Max-Age="+maxAge)}
export function authorized(req){const secret=Netlify.env.get("ADMIN_CODE");if(!secret)return false;const supplied=req.headers.get("x-admin-code");if(supplied&&equal(supplied,secret))return true;if(!["GET","HEAD"].includes(req.method)&&!sameOrigin(req))return false;const p=(req.headers.get("cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));return valid(p?.slice(COOKIE.length+1),secret)}
