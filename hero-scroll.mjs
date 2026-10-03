const clamp = x => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const smooth = x => {const t=clamp(x);return t*t*(3-2*t);};
export function getPageFlowState(scrolled, heroHeight, reducedMotion=false) {
 const progress=clamp(scrolled/Math.max(heroHeight,1));
 return {progress, scatter:smooth((progress-.04)/.20), flow:reducedMotion || progress<.28 ? -1 : smooth((progress-.28)/.68)};
}
export function getWaveX(flow, seed) {
 const stagger=(seed*43.17-Math.floor(seed*43.17))*.30;
 return (-1.35-stagger)+(2.70+2*stagger)*clamp(flow);
}
