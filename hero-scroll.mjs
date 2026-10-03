const clamp = x => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const smooth = x => {const t=clamp(x);return t*t*(3-2*t);};
export function getPageFlowState(scrolled, heroHeight, reducedMotion=false) {
 const progress=clamp(scrolled/Math.max(heroHeight,1));
 return {progress, scatter:smooth((progress-.04)/.20), flow:reducedMotion || progress<.28 ? -1 : smooth((progress-.28)/.68)};
}
export function getWaveX(flow, seed) {
 return -4.2 + 5.6 * clamp(flow) + clamp(seed) * 2.8;
}
export function getWaveY(flow, seed, pageProgress) {
 const x=getWaveX(flow,seed), fract=x=>x-Math.floor(x);
 const lane=(Math.floor(fract(seed*17.31)*7)-3)*.055;
 const phase=x*2.8-clamp(flow)*2;
 return -clamp(pageProgress)+Math.sin(phase)*.16+Math.sin(x*1.3+clamp(flow)*2)*.08+lane+(fract(seed*67.1)-.5)*.012;
}
