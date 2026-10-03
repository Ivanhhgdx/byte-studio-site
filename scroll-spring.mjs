const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
export const SPRING_MAX_SPEED=.55;
export function stepScrollSpring(state,target,delta,reducedMotion=false) {
 target=clamp(target);
 if(reducedMotion)return {value:target,velocity:0};
 let value=clamp(state?.value),velocity=Number.isFinite(state?.velocity)?state.velocity:0;
 const dt=Math.max(0,Math.min(Number.isFinite(delta)?delta:0,.1));
 const count=Math.max(1,Math.ceil(dt*120)),h=dt/count;
 for(let i=0;i<count;i++) {
  velocity+=(144*(target-value)-13.2*velocity)*h;
  velocity=Math.max(-SPRING_MAX_SPEED,Math.min(SPRING_MAX_SPEED,velocity));
  value+=velocity*h;
  if(value<0||value>1){value=clamp(value);velocity=0;}
 }
 if(Math.abs(value-target)<.00002&&Math.abs(velocity)<.0002){value=target;velocity=0;}
 return {value,velocity};
}
export function getCopyReturnState(previous,current,returned=false) {
 const next=clamp(current),old=clamp(previous);
 const returning=returned||(old>.015&&next<old-.00001);
 const t=clamp(next/.04);
 return {returned:returning,reveal:returning?t*t*(3-2*t):1};
}
