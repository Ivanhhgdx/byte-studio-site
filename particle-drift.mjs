const fract=x=>x-Math.floor(x);
const finite=x=>Number.isFinite(x)?x:0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,finite(x)));
export const DRIFT_LIMIT=.24;
export const DRIFT_MAX_SPEED=1.8;
// Linear work: each particle has one anchor and at most two close neighbours.
export function createParticleDrift(seeds,baseOffsets) {
 const n=seeds.length,offsets=new Float32Array(n*2),velocity=new Float32Array(n*2),forces=new Float32Array(n*2);
 const rest=new Float32Array(n*2),omega=new Float32Array(n),damping=new Float32Array(n),mass=new Float32Array(n);
 for(let i=0;i<n;i++){const s=seeds[i];rest[2*i]=(s-.5)*.035;rest[2*i+1]=(fract(s*53.1)-.5)*.035;omega[i]=4.5+fract(s*47.3)*4;damping[i]=.42+fract(s*29.7)*.24;mass[i]=.7+fract(s*19.9)*.6;}
 let previous=0,lastImpulse=0,sleeping=false,wasEnabled=false,moved=false;
 function reset(target=0){const changed=moved;offsets.fill(0);velocity.fill(0);previous=clamp(target,0,1);lastImpulse=0;sleeping=true;wasEnabled=false;moved=false;return changed;}
 function step(delta,target,enabled=true,reduced=false) {
  target=clamp(target,0,1);
  if(reduced||!enabled)return reset(target);
  const change=target-previous;previous=target;
  // Scroll displacement injects finite energy; no division by near-zero dt.
  const rate=Math.abs(change)/Math.max(1/120,clamp(delta,0,.06));
  const urgency=clamp((rate-.2)/1.5,0,1),burst=urgency*urgency*(3-2*urgency);
  const kick=clamp(change*6*(.1+.9*burst),-1.2,1.2);lastImpulse=kick;
  if(!wasEnabled||Math.abs(kick)>.0002)sleeping=false;wasEnabled=true;
  if(sleeping)return false;
  let changed=false,maxMotion=0;
  if(Math.abs(kick)>.0002)for(let i=0;i<n;i++){const k=2*i,s=seeds[i];velocity[k]+=kick*(.12+Math.sin(s*91.7)*.85)/mass[i];velocity[k+1]+=kick*Math.sin(s*57.3+1.7)*1.15/mass[i];}
  const dt=clamp(delta,0,.06),count=Math.max(1,Math.ceil(dt*120)),h=dt/count;
  for(let part=0;part<count;part++){
   for(let i=0;i<n;i++){const k=2*i,w=omega[i],drag=2*damping[i]*w;forces[k]=-w*w*offsets[k]-drag*velocity[k];forces[k+1]=-w*w*offsets[k+1]-drag*velocity[k+1];}
   // Repulsion only, never a chain-wide attraction or collective spring.
   for(let i=0;i<n-1;i++){if(i%8===7)continue;const k=2*i,j=k+2;
    const dx=baseOffsets[i+1]-baseOffsets[i]+rest[j]-rest[k]+offsets[j]-offsets[k],dy=rest[j+1]-rest[k+1]+offsets[j+1]-offsets[k+1];
    const distance=Math.hypot(dx,dy),radius=.022;
    if(distance<radius){const safe=Math.max(distance,.0001),push=(radius-distance)*20;const fx=push*(distance<.0001?1:dx/safe),fy=push*dy/safe;forces[k]-=fx/mass[i];forces[k+1]-=fy/mass[i];forces[j]+=fx/mass[i+1];forces[j+1]+=fy/mass[i+1];}
   }
   for(let k=0;k<n*2;k++){velocity[k]=clamp(velocity[k]+forces[k]*h,-DRIFT_MAX_SPEED,DRIFT_MAX_SPEED);const old=offsets[k];offsets[k]=clamp(old+velocity[k]*h,-DRIFT_LIMIT,DRIFT_LIMIT);if(Math.abs(offsets[k]-old)>1e-7)changed=true;maxMotion=Math.max(maxMotion,Math.abs(velocity[k]));if(Math.abs(offsets[k])>=DRIFT_LIMIT&&offsets[k]*velocity[k]>0)velocity[k]=0;}
  }
  sleeping=maxMotion<.00005&&Math.abs(kick)<=.0002;moved=moved||changed;
  return changed;
 }
 return {offsets,velocity,rest,step,reset,get lastImpulse(){return lastImpulse;}};
}
