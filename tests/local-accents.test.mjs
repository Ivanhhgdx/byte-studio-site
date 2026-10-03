import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../script.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('        float clock = uAccentTime'),source.indexOf('        float front =',source.indexOf('        float clock = uAccentTime'))).replace(/float /g,'let ');
const flash=new Function('aFlowSeed','aFlowOffset','uAccentTime','fract','floor','sin','step','abs','exp','let vAccent=0;'+body+'return vAccent;');
const fract=x=>x-Math.floor(x);const evalFlash=(s,o,t)=>flash(s,o,t,fract,Math.floor,Math.sin,(edge,x)=>x>=edge?1:0,Math.abs,Math.exp);
test('local flashes are sparse and strongest in one neighbouring sample',()=>{let hits=0,peak=0;for(let frame=0;frame<600;frame++){const t=frame/60;let bright=0;for(let i=0;i<432;i++){const seed=fract(Math.sin(i*127.1+110*311.7)*43758.5453);for(let k=0;k<8;k++)if(evalFlash(seed,(k/7-.5)*.18,t)>.3){bright++;hits++;}}peak=Math.max(peak,bright);}assert.ok(hits>100);assert.ok(peak<40);});
test('accent uniforms are disabled for reduced motion and during original entry',()=>{assert.match(source,/uAccentTime.value = entranceMotion && elapsed - introStartTime >= INTRO_DURATION \? elapsed : -1/);assert.match(source,/ripple \* 0\.006/);});
