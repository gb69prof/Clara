const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function setup(embedded){
 const elements={},events={},timers=new Map();let timer=0,stored=null,sent=null,navigation=null;
 const el=id=>elements[id]??={value:'',hidden:false,textContent:'',dataset:{},addEventListener(n,f){events[id+':'+n]=f},setAttribute(){},focus(){},querySelector(selector){return el(id+':'+selector)}};
 const document={hidden:false,body:{classList:{contains:()=>true}},getElementById:el,addEventListener(){}};
 const window={parent:{},isSecureContext:true,addEventListener(){}};
 const transport={embedded,chatCreate:async data=>{stored={...data,id:data.requestId,question:data.message,status:'waiting',reply:''};return {chat:stored}},chatRead:async()=>({chat:stored}),message:async text=>{sent=text;stored={...stored,status:'answered',reply:'Risposta reale <script> non eseguito.'}}};
 const context={window,document,ClaraTransport:transport,location:{href:'https://clara.test/',assign:url=>navigation=url},URL,FormData:class{get(){return 'text'}},crypto:require('node:crypto').webcrypto,setTimeout:f=>{timers.set(++timer,f);return timer},clearTimeout:id=>timers.delete(id),console};
 vm.runInNewContext(fs.readFileSync('public/home.js','utf8'),context);
 return {el,events,timers,sent:()=>sent,navigation:()=>navigation,stored:()=>stored};
}
const flush=()=>new Promise(setImmediate);
(async()=>{
 const app=setup(true);app.el('request').value='Una domanda concreta';app.events['composer:submit']({preventDefault(){}});await flush();
 assert.match(app.sent(),/clara_chat_reply/);assert.match(app.sent(),/Una domanda concreta/);
 for(const f of [...app.timers.values()])f();await flush();
 assert.equal(app.el('reply-text').textContent,'Risposta reale <script> non eseguito.');assert.equal(app.el('reply').hidden,false);assert.equal(app.el('send').disabled,false);
 assert.equal(app.el('request').value,'Una domanda concreta');
 app.events['new-chat:click']();assert.equal(app.el('request').value,'');assert.equal(app.el('reply').hidden,true);
 const web=setup(false);web.el('request').value='Richiesta dal sito';web.events['composer:submit']({preventDefault(){}});await flush();
 assert.match(web.navigation(),/^https:\/\/chatgpt.com\/plugins\//);assert.equal(web.sent(),null);
 assert.equal(new URL(web.navigation()).searchParams.get('path'),'/?chat='+web.stored().id);
 assert(!web.navigation().includes('Richiesta'));
 console.log('PASS: embedded message → callback → reply; safe text rendering; reset; website handoff preserves request without putting its text in URL. DOM simulation, not host/browser QA.');
})().catch(e=>{console.error(e);process.exitCode=1});
