'use strict';
window.ClaraTransport = (() => {
  const embedded = window.parent !== window;
  const pending = new Map();
  let seq = 0, initialized = false, hostContext = {}, hostCapabilities = {}, initError = '';
  const compatibility = () => window.openai;
  function error(message, code) { return Object.assign(new Error(message), {code}); }
  function request(method, params, timeout = 12000) {
    return new Promise((resolve, reject) => {
      const id = 'clara-' + (++seq);
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(error(method === 'ui/message'
          ? 'Invio non confermato. Controlla la conversazione prima di riprovare, per evitare un doppio messaggio.'
          : 'Collegamento a ChatGPT non disponibile. Puoi usare direttamente la conversazione.',
          method === 'ui/message' ? 'DELIVERY_UNKNOWN' : 'HOST_TIMEOUT'));
      }, timeout);
      pending.set(id, {resolve, reject, timer});
      window.parent.postMessage({jsonrpc:'2.0', id, method, params}, '*');
    });
  }
  function acceptState(result) {
    const value = result?._meta?.claraState || result?.structuredContent;
    if (value?.state) window.dispatchEvent(new CustomEvent('clara:state', {detail:value}));
  }
  function applyPath(path) {
    try {
      const url = new URL(path, 'https://clara.local');
      const section = url.pathname.slice(1) || 'scrivania';
      if (['scrivania','classi','lezioni','progetti','biblioteca','calendario','memoria'].includes(section)) location.hash = '#' + section;
      // Compatibility: old saved exchanges remain readable; new input is never stored here.
      const chat = url.searchParams.get('chat');
      if (chat && /^[a-f\d-]{36}$/.test(chat)) {
        window.ClaraPendingChat = chat;
        window.dispatchEvent(new CustomEvent('clara:chat', {detail:chat}));
      }
      const project = url.searchParams.get('project');
      if (project) window.dispatchEvent(new CustomEvent('clara:project', {detail:project}));
    } catch {}
  }
  function capabilities() {
    const nativeMessage = initialized && !!hostCapabilities.message?.text;
    const aliasMessage = typeof compatibility()?.sendFollowUpMessage === 'function';
    return {
      embedded, connected: initialized || aliasMessage,
      canMessage: nativeMessage || aliasMessage,
      canCallTools: (initialized && !!hostCapabilities.serverTools) || typeof compatibility()?.callTool === 'function',
      transport: nativeMessage ? 'mcp' : aliasMessage ? 'compatibility' : embedded ? 'unavailable' : 'standalone',
      microphone: !embedded || !!hostCapabilities.sandbox?.permissions?.microphone,
      error: initError
    };
  }
  function announce() { window.dispatchEvent(new CustomEvent('clara:connection', {detail:capabilities()})); }
  window.addEventListener('openai:set_globals', event => {
    acceptState({structuredContent:event.detail?.globals?.toolOutput});
    announce();
  });
  window.addEventListener('message', event => {
    if (!embedded || event.source !== window.parent) return;
    const msg = event.data;
    if (!msg || msg.jsonrpc !== '2.0') return;
    if (msg.id !== undefined && pending.has(msg.id)) {
      const item = pending.get(msg.id); clearTimeout(item.timer); pending.delete(msg.id);
      if (msg.error) item.reject(error(msg.error.message || 'Operazione rifiutata da ChatGPT.', msg.error.code));
      else item.resolve(msg.result);
    } else if (msg.method === 'ui/notifications/tool-result') acceptState(msg.params);
    else if (msg.method === 'ui/notifications/host-context-changed') {
      hostContext = {...hostContext, ...msg.params};
      if (hostContext['openai/deepLink']?.url) applyPath(hostContext['openai/deepLink'].url);
    } else if (msg.method === 'ui/notifications/tool-input' && msg.params?.arguments?.path) applyPath(msg.params.arguments.path);
  });
  const ready = embedded ? request('ui/initialize', {
    appInfo:{name:'Clara', version:'9.0.0'}, appCapabilities:{availableDisplayModes:['fullscreen','inline']}, protocolVersion:'2026-01-26'
  }, 8000).then(result => {
    initialized = true; hostContext = result.hostContext || {}; hostCapabilities = result.hostCapabilities || {};
    window.parent.postMessage({jsonrpc:'2.0', method:'ui/notifications/initialized', params:{}}, '*');
    if (hostContext['openai/deepLink']?.url) applyPath(hostContext['openai/deepLink'].url);
    announce(); return capabilities();
  }).catch(e => {initError=e.message; announce(); return capabilities();}) : Promise.resolve(capabilities());
  async function call(name, args) {
    await ready;
    let result;
    if (initialized && hostCapabilities.serverTools) result = await request('tools/call', {name, arguments:args});
    else if (typeof compatibility()?.callTool === 'function') result = await compatibility().callTool(name, args);
    else throw error('Gli strumenti di Clara non sono disponibili in questo pannello. Apri il plugin nella conversazione.', 'NO_TOOLS');
    if (result?.isError) throw error(result.content?.find(c=>c.type==='text')?.text || 'Operazione non riuscita.', 'TOOL_ERROR');
    return result?._meta?.claraState || result?.structuredContent || result;
  }
  async function http(path, body) {
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(path, {method:body?'POST':'GET', headers:body?{'Content-Type':'application/json'}:{}, body:body?JSON.stringify(body):undefined, credentials:'same-origin', cache:'no-store', signal:controller.signal});
      if (response.redirected) throw new Error('Accedi con il tuo account ChatGPT al sito di Clara.');
      const data=await response.json();
      if (!response.ok) throw new Error(data.error || 'Archivio non disponibile.');
      return data;
    } finally {clearTimeout(timer);}
  }
  async function message(text) {
    if (typeof text !== 'string' || !text.trim() || text.length > 20000) throw error('Scrivi un messaggio valido.', 'INVALID_MESSAGE');
    await ready;
    // Choose one transport BEFORE delivery. Never retry through a second API after an ambiguous timeout.
    if (initialized && hostCapabilities.message?.text) {
      const params={role:'user', content:[{type:'text', text}]};
      if (hostCapabilities.experimental?.['openai/message']) params._meta={'openai/message':{target:'active', send:true}};
      const response=await request('ui/message', params);
      if (response?.isError) throw error('ChatGPT ha rifiutato il messaggio. Il testo resta disponibile.', 'MESSAGE_REJECTED');
      return {accepted:true, transport:'mcp', replyLocation:'chatgpt'};
    }
    if (typeof compatibility()?.sendFollowUpMessage === 'function') {
      // Documented compatibility alias, used only when the shared capability is absent.
      let timer;
      try {
        const result=await Promise.race([
          compatibility().sendFollowUpMessage({prompt:text, scrollToBottom:true}),
          new Promise((_,reject)=>{timer=setTimeout(()=>reject(error('Invio non confermato. Controlla la conversazione prima di riprovare.', 'DELIVERY_UNKNOWN')),12000);})
        ]);
        if(result?.isError)throw error('ChatGPT ha rifiutato il messaggio. Il testo resta disponibile.', 'MESSAGE_REJECTED');
      } finally {clearTimeout(timer);}
      return {accepted:true, transport:'compatibility', replyLocation:'chatgpt'};
    }
    throw error('Apri Clara accanto alla conversazione ChatGPT che vuoi continuare. Qui puoi copiare il messaggio.', 'NO_CONVERSATION');
  }
  return {embedded, ready:()=>ready, capabilities, message,
    load:()=>embedded?call('clara_state',{}):http('/api/state'),
    command:payload=>embedded?call('clara_command',payload):http('/api/command',payload),
    chatRead:id=>embedded?call('clara_chat_read',{requestId:id}):http('/api/chat?id='+encodeURIComponent(id))};
})();
