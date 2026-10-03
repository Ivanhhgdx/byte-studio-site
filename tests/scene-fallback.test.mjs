import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {bootParticleScene} from '../scene-fallback.mjs';
function dom(){const elements=Object.fromEntries(['.hero','.hero-stage','.scene-wrap','.hero-copy'].map(key=>[key,{dataset:{},style:{setProperty(k,v){this[k]=v;}}}]));return {elements,querySelector:k=>elements[k],querySelectorAll:()=>[]};}
test('actual renderer-constructor failure shows copy and working CTA',()=>{const d=dom();const source=readFileSync(new URL('../script.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');let attempts=0;vm.runInNewContext(source,{document:d,bootParticleScene,THREE:{Scene:class{},PerspectiveCamera:class{},WebGLRenderer:class{constructor(){attempts++;throw Error('Error creating WebGL context');}}}});assert.equal(attempts,1);assert.equal(d.elements['.hero'].dataset.sceneStatus,'fallback');assert.equal(d.elements['.hero-copy'].style.opacity,'1');assert.equal(d.elements['.hero-copy'].style.pointerEvents,'auto');assert.equal(d.elements['.scene-wrap'].style.display,'none');});
test('successful scene retains animated appearance',()=>{const d=dom();let calls=0;assert.equal(bootParticleScene(()=>calls++,d),true);assert.equal(calls,1);assert.equal(d.elements['.hero-copy'].style.opacity,undefined);assert.equal(d.elements['.scene-wrap'].style.display,undefined);});
test('fallback tolerates missing scene markup',()=>assert.equal(bootParticleScene(()=>{throw Error('no WebGL');},{querySelector:()=>null}),false));
