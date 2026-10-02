import test from 'node:test';
import assert from 'node:assert/strict';
import {getHeroScrollState as state,getGeometryBounds as bounds,HERO_PHASES as h} from '../hero-scroll.mjs';
test('scroll state is deterministic and reverses without history',()=>{for(const p of [0,.2,.38,.58,.7,.86,.98,1]){const before=state(p);state(1);state(0);assert.deepEqual(state(p),before);}});
test('scatter finishes before geometry starts',()=>{assert.ok(h.scatterEnd<h.geometryStart);assert.equal(state(.7).scatter,1);assert.equal(state(.7).geometry,-1);});
test('geometry begins left and finishes right on mobile and desktop',()=>{for(const aspect of [390/844,1440/1000]){assert.ok(bounds(0,aspect).right<-1);assert.ok(bounds(1,aspect).left>1);assert.ok(bounds(.5,aspect).top<1);}assert.ok(h.geometryEnd<1);});
test('reduced motion uses no geometry or running time',()=>{for(const p of [0,.38,.86,1]){assert.equal(state(p,true).geometry,-1);assert.equal(state(p,true).time,0);}assert.equal(state(0,true).copyOpacity,1);});
