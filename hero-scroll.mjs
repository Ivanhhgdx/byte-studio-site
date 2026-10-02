const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const smooth = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
export const HERO_PHASES = Object.freeze({ revealStart: .08, revealEnd: .38, scatterStart: .46, scatterEnd: .68, geometryStart: .74, geometryEnd: .98 });
// No clock, previous frame, pointer or spring state enters this timeline.
export function getHeroScrollState(progress, reducedMotion = false) {
 const p = clamp(progress), h = HERO_PHASES;
 const reveal = reducedMotion ? 1 : smooth((p - h.revealStart) / (h.revealEnd - h.revealStart));
 const scatter = smooth((p - h.scatterStart) / (h.scatterEnd - h.scatterStart));
 const geometry = p >= h.geometryStart ? smooth((p - h.geometryStart) / (h.geometryEnd - h.geometryStart)) : -1;
 return { progress:p, reveal, scatter, geometry:reducedMotion ? -1 : geometry, time:reducedMotion ? 0 : p * 8, copyOpacity:reveal * (1 - scatter) };
}
// NDC bounds used by the shader: the whole knot starts/ends outside the screen.
export function getGeometryBounds(progress, aspect) {
 const radiusY = Math.min(.58, .7 * Math.max(.01, aspect));
 const radiusX = radiusY / Math.max(.01, aspect);
 const margin = .18;
 const centerX = (-1 - radiusX - margin) + (2 + 2 * radiusX + 2 * margin) * clamp(progress);
 return { left:centerX-radiusX, right:centerX+radiusX, top:radiusY, bottom:-radiusY };
}
