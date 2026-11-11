const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const test=require('node:test');
const flush=()=>new Promise(setImmediate);
function host({caps={message:{text:{}},serverTools:{},experimental:{'openai/message':{}}},alias,replyMessage=true,init=true,embedded=true}={}) {
 const events={},sent=[],timers=new Map();let tick=0;
 const win={addEventListener:(n,f)=>events[n]=f,dispatchEvent(){},openai:alias};
 const parent={postMessage:m=>{sent.push(m);if(m.method==='ui/initialize'&&init)queueMicrotask(()=>respond(m,{hostCapabilities:caps,hostContext:{}}));if(m.method==='ui/message'&&replyMessage)queueMicrotask(()=>respond(m,{}));if(m.method==='tools/call')queueMicrotask(()=>respond(m,{structuredContent:{state:{projects:[]}}}));}};
 win.parent=embedded?parent:win;
 function respond(m,result,source=parent){events.message({source,data:{jsonrpc:'2.0',id:m.id,result}});}
 vm.runInNewContext(fs.readFileSync('public/bridge.js','utf8'),{window:win,location:{hash:''},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}},URL,AbortController,setTimeout:(fn,ms)=>{timers.set(++tick,{fn,ms});return tick},clearTimeout:id=>timers.delete(id),console});
 return {api:win.ClaraTransport,sent,timers,respond};
}
test('handshake then direct user message goes to active conversation; no storage/tool dependency',async()=>{
 const h=host();await h.api.ready();assert(h.sent.some(m=>m.method==='ui/notifications/initialized'));
 await h.api.message('Continuiamo il progetto');const m=h.sent.find(m=>m.method==='ui/message');
 assert.equal(m.params.role,'user');assert.equal(m.params.content[0].text,'Continuiamo il progetto');
 assert.equal(m.params._meta['openai/message'].target,'active');assert.equal(m.params._meta['openai/message'].send,true);
 assert(!h.sent.some(m=>m.method==='tools/call'));
});
test('standard host without optional extensions receives standard message only',async()=>{
 const h=host({caps:{message:{text:{}}}});await h.api.message('Ciao');assert(!h.sent.find(m=>m.method==='ui/message').params._meta);
});
test('documented compatibility alias is used only if standard message is unavailable',async()=>{
 const seen=[];const h=host({caps:{},alias:{sendFollowUpMessage:async m=>seen.push(m)}});await h.api.message('Testo');
 assert.equal(seen[0].prompt,'Testo');assert(!h.sent.some(m=>m.method==='ui/message'));
});
test('missing capability fails clearly without pretending to send',async()=>{
 const h=host({caps:{}});await assert.rejects(h.api.message('Ciao'),e=>e.code==='NO_CONVERSATION');
 assert(!h.api.capabilities().canMessage);
 const outside=host({embedded:false});await assert.rejects(outside.api.message('Ciao'),e=>e.code==='NO_CONVERSATION');assert.equal(outside.sent.length,0);
});
test('foreign message cannot complete delivery; timeout never auto-retries through alias',async()=>{
 let aliasCalls=0;const h=host({replyMessage:false,alias:{sendFollowUpMessage:async()=>aliasCalls++}});
 await h.api.ready();const pending=h.api.message('Non duplicare');const rejection=assert.rejects(pending,e=>e.code==='DELIVERY_UNKNOWN');await flush();
 const msg=h.sent.find(m=>m.method==='ui/message');h.respond(msg,{},{});assert.equal(h.timers.size,1);
 for(const timer of [...h.timers.values()])timer.fn();await rejection;
 assert.equal(aliasCalls,0);assert.equal(h.sent.filter(m=>m.method==='ui/message').length,1);
});
test('initialize timeout can fall back before delivery, and tools keep using authorized bridge',async()=>{
 let calls=0;const h=host({init:false,alias:{sendFollowUpMessage:async()=>calls++}});
 for(const timer of [...h.timers.values()])timer.fn();await h.api.message('Una volta');assert.equal(calls,1);
 const native=host();const state=await native.api.load();assert.equal(state.state.projects.length,0);
});
test('compatibility delivery also times out without silently resending',async()=>{
 let calls=0;const h=host({caps:{},alias:{sendFollowUpMessage:()=>{calls++;return new Promise(()=>{});}}});
 await h.api.ready();const sending=h.api.message('Controlla la chat');const rejected=assert.rejects(sending,e=>e.code==='DELIVERY_UNKNOWN');await flush();
 for(const timer of [...h.timers.values()])timer.fn();await rejected;assert.equal(calls,1);
});
