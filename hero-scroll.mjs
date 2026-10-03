const clamp = x => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const smooth = x => {const t=clamp(x);return t*t*(3-2*t);};
export function getPageFlowState(scrolled, heroHeight, reducedMotion=false) {
 const progress=clamp(scrolled/Math.max(heroHeight,1));
 return {progress, scatter:smooth((progress-.04)/.20), flow:reducedMotion || progress<.28 ? -1 : smooth((progress-.28)/.68)};
}
const fract = x => x-Math.floor(x);
export function getParticleFlowState(flow, seed, pageProgress=0) {
 const t=clamp(flow), s=clamp(seed);
 const speedCurve=.65+fract(s*17.31)*1.10;
 const particleT=Math.pow(t,speedCurve);
 const startX=-1.45-s*3.20, endX=1.45+fract(s*23.70)*2.60;
 const x=startX+(endX-startX)*particleT;
 const phase=s*Math.PI*2, frequency=1.4+fract(s*13.9)*2.1;
 const amplitude=.09+fract(s*47.1)*.16;
 const crest=Math.sin(x*1.9-t*2)*.08+Math.sin(x*frequency+phase+particleT*2)*amplitude;
 const y=-clamp(pageProgress)+crest+(fract(s*67.1)-.5)*.20;
 return {x,y,speedCurve,particleT,phase,frequency,amplitude};
}
export function getWaveX(flow, seed) {return getParticleFlowState(flow,seed).x;}
export function getWaveY(flow, seed, pageProgress) {return getParticleFlowState(flow,seed,pageProgress).y;}
