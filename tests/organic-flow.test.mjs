import test from 'node:test';
import assert from 'node:assert/strict';
import {getParticleFlowState as state} from '../hero-scroll.mjs';
test('individual particle paths are monotone, reversible, and varied',()=>{const curves=[],phases=[],frequencies=[];for(let i=0;i<200;i++){const seed=i/200;let previous=-Infinity;for(let j=0;j<=100;j++){const p=j/100,s=state(p,seed,.6);assert.ok(s.x>=previous);previous=s.x;const before={...s};state(1,seed,.6);state(0,seed,.6);assert.deepEqual(state(p,seed,.6),before);}const s=state(.5,seed,.6);curves.push(s.speedCurve);phases.push(s.phase);frequencies.push(s.frequency);}assert.ok(new Set(curves.map(x=>x.toFixed(4))).size>190);assert.equal(new Set(phases).size,200);assert.ok(new Set(frequencies.map(x=>x.toFixed(4))).size>190);});
