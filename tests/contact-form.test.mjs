import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../site.js', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('const contactEndpoint'), source.indexOf('document.querySelectorAll("[data-comparison]")'));
function fixture(fetchImpl, valid=true) {
 let submit, resets=0, calls=[];
 const label={textContent:''}, status={textContent:''};
 const button={disabled:false,querySelector:()=>label,classList:{add(){}}};
 const values=new Map([['name','Test'],['contact','test@example.invalid'],['message','Bot scenario'],['urgency','standard'],['website','']]);
 const form={dataset:{leadTopic:'Telegram-бот'},reportValidity:()=>valid,querySelector:s=>s==='[data-form-status]'?status:button,reset(){resets++},setAttribute(){},removeAttribute(){}};
 class FakeData extends Map { constructor(){super(values);} }
 let abort;
 const context={URL,Date,AbortController,FormData:FakeData,window:{location:{href:'https://bite-studio.ru/telegram-bots.html?ref=partner_1',origin:'https://bite-studio.ru',pathname:'/telegram-bots.html'}},document:{querySelectorAll:()=>[],querySelector:s=>s==='[data-contact-form]'?{addEventListener(type,cb){submit=cb}}:null},setTimeout(cb){abort=cb;return 1},clearTimeout(){},fetch:async (...args)=>{calls.push(args);return fetchImpl(...args)}};
 vm.runInNewContext(code, context);
 return {send:()=>submit({preventDefault(){},currentTarget:form}),form,button,label,status,values,calls,resets:()=>resets,abort:()=>abort()};
}
test('invalid form makes no request',async()=>{const f=fixture(()=>{throw Error()},false);await f.send();assert.equal(f.calls.length,0)});
test('confirmed delivery marks success once and preserves routing',async()=>{const f=fixture(async()=>({ok:true,json:async()=>({ok:true})}));await f.send();await f.send();assert.equal(f.calls.length,1);assert.equal(f.resets(),1);assert.equal(f.form.dataset.sent,'true');assert.equal(f.button.disabled,true);const payload=JSON.parse(f.calls[0][1].body);assert.match(payload.message,/Направление: Telegram-бот/);assert.match(payload.message,/Код партнёра: partner_1/);assert.equal(payload.source,'https://bite-studio.ru/telegram-bots.html');assert.equal(payload.website,'');assert.equal(f.form.dataset.submitting,undefined)});
for (const [name, response] of [['HTTP error',{ok:false}],['negative confirmation',{ok:true,json:async()=>({ok:false})}],['missing confirmation',{ok:true,json:async()=>({})}],['invalid JSON',{ok:true,json:async()=>{throw Error()}}]]) test(name+' retains data and allows retry',async()=>{const f=fixture(async()=>response);await f.send();assert.equal(f.resets(),0);assert.equal(f.form.dataset.sent,undefined);assert.equal(f.button.disabled,false);assert.match(f.status.textContent,/Не удалось подтвердить/);await f.send();assert.equal(f.calls.length,2)});
test('network failure retains data',async()=>{const f=fixture(async()=>{throw Error('offline')});await f.send();assert.equal(f.resets(),0);assert.equal(f.button.disabled,false)});
test('concurrent submits make one request',async()=>{let finish;const f=fixture(()=>new Promise(r=>finish=r));const first=f.send();await f.send();assert.equal(f.calls.length,1);assert.equal(f.button.disabled,true);finish({ok:true,json:async()=>({ok:true})});await first;assert.equal(f.resets(),1)});
test('timeout abort recovers form without success',async()=>{const f=fixture((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout')))));const pending=f.send();f.abort();await pending;assert.equal(f.button.disabled,false);assert.equal(f.resets(),0);assert.equal(f.form.dataset.sent,undefined)});
