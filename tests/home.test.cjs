const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const flush=()=>new Promise(setImmediate);
function setup({canMessage=true,fail,recognition=false}={}) {
 const elements={},events={},winEvents={},sent=[],timers=new Map();let serial=0,session;
 const html=fs.readFileSync('public/index.html','utf8');
 function node(){return {value:'',hidden:false,textContent:'',dataset:{},children:[],disabled:false,addEventListener(){},setAttribute(){},focus(){},select(){this.selected=true},append(...nodes){this.children.push(...nodes)},replaceChildren(){this.children=[]}};}
 for(const match of html.matchAll(/\bid="([^"]+)"/g)){assert(!elements[match[1]],'duplicate real DOM ID');elements[match[1]]=node();}
 const el=id=>{assert(elements[id],'Missing HTML element: '+id);return elements[id];};
 for(const [id,e]of Object.entries(elements)){e.addEventListener=(name,f)=>events[id+':'+name]=f;}
 const sendSpan=node();el('send').querySelector=()=>sendSpan;
 const doc={hidden:false,permissionsPolicy:{allowsFeature:()=>true},getElementById:el,createElement:node,addEventListener:(n,f)=>events['document:'+n]=f};
 const caps={canMessage,embedded:canMessage,microphone:true};
 const transport={capabilities:()=>caps,ready:async()=>caps,message:async text=>{sent.push(text);if(fail)throw Object.assign(new Error('Invio non confermato'),{code:fail});return {accepted:true}},chatRead:async()=>{throw new Error('No legacy request in this test')}};
 const win={isSecureContext:true,addEventListener:(n,f)=>winEvents[n]=f};
 if(recognition)win.SpeechRecognition=class{constructor(){session=this}start(){}stop(){this.onend()}abort(){}};
 const context={window:win,document:doc,ClaraTransport:transport,navigator:{clipboard:{writeText:async()=>{}}},location:{href:'https://clara.test/'},URL,setTimeout:f=>{timers.set(++serial,f);return serial},clearTimeout:id=>timers.delete(id),console};
 vm.runInNewContext(fs.readFileSync('public/home.js','utf8'),context);
 return {el,events,winEvents,sent,session:()=>session,submit:()=>events['composer:submit']({preventDefault(){}})};
}
test('real HTML controls send exact text, preserve follow-up flow, never create server dialogue',async()=>{
 const h=setup();await flush();h.el('request').value='Una domanda <script>';await h.submit();
 assert.deepEqual(h.sent,['Una domanda <script>']);assert.equal(h.el('request').value,'');assert.equal(h.el('send').disabled,false);
 assert.equal(h.el('sent-messages').children[0].children[1].textContent,'Una domanda <script>');assert.match(h.el('status').textContent,/nella conversazione/);
 h.el('request').value='Continua da lì';await h.submit();assert.equal(h.sent.length,2);
});
test('outside host, sending is disabled and draft can be copied without redirect',async()=>{
 const h=setup({canMessage:false});await flush();assert(h.el('send').disabled);h.el('request').value='Bozza';await h.submit();assert.equal(h.sent.length,0);assert.equal(h.el('request').value,'Bozza');assert(!h.el('standalone-help').hidden);
});
test('uncertain delivery preserves draft and prevents duplicate until explicit check',async()=>{
 const h=setup({fail:'DELIVERY_UNKNOWN'});await flush();h.el('request').value='Richiesta';await h.submit();await h.submit();assert.equal(h.sent.length,1);assert.equal(h.el('request').value,'Richiesta');assert(h.el('send').disabled);assert(!h.el('confirm-checked').hidden);
 h.events['confirm-checked:click']();assert(!h.el('send').disabled);
});
test('microphone is disabled if absent; successful dictation prepares text without sending',async()=>{
 const absent=setup();await flush();assert(absent.el('voice').disabled);
 const h=setup({recognition:true});await flush();h.el('request').value='Appunti';h.events['voice:click']();
 h.session().onresult({results:[Object.assign([{transcript:'sul Foscolo'}],{isFinal:true})]});h.session().onend();
 assert.equal(h.el('request').value,'Appunti\nsul Foscolo');assert.equal(h.sent.length,0);assert(!h.el('request').readOnly);
});
test('denied microphone leaves draft intact and sends nothing',async()=>{
 const h=setup({recognition:true});await flush();h.el('request').value='Bozza';h.events['voice:click']();h.session().onerror({error:'not-allowed'});h.session().onend();assert.equal(h.sent.length,0);assert.equal(h.el('request').value,'Bozza');assert.match(h.el('status').textContent,/non autorizzato/);
});
