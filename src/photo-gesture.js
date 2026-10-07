const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function gestureTransform(start,points,box){
  const first=start.points,initial=start.transform;
  const mid=a=>({x:a.reduce((s,p)=>s+p.x,0)/a.length,y:a.reduce((s,p)=>s+p.y,0)/a.length});
  const a=mid(first),b=mid(points);let ratio=1,angle=0;
  if(first.length===2&&points.length===2){
    const dist=p=>Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);
    ratio=dist(points)/Math.max(1,dist(first));
    const theta=p=>Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
    angle=theta(points)-theta(first);angle=Math.atan2(Math.sin(angle),Math.cos(angle));
  }
  const zoom=clamp(initial.cardZoom*ratio,.7,5);ratio=zoom/initial.cardZoom;
  const cx=box.width/2+initial.cardX/400*box.width,cy=box.height/2+initial.cardY/400*box.height;
  const dx=(cx-a.x)*ratio,dy=(cy-a.y)*ratio;
  const nx=b.x+dx*Math.cos(angle)-dy*Math.sin(angle),ny=b.y+dx*Math.sin(angle)+dy*Math.cos(angle);
  return {cardZoom:zoom,cardX:clamp((nx-box.width/2)/box.width*400,-100,100),cardY:clamp((ny-box.height/2)/box.height*400,-100,100),cardRotation:((initial.cardRotation+angle*180/Math.PI+540)%360)-180};
}
