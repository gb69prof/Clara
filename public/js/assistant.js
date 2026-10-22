export function resolveEndpoint(endpoint, origin) {
  const url = new URL(endpoint, origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== new URL(origin).origin) {
    throw new Error('Il servizio Clara deve usare un indirizzo dello stesso sito.');
  }
  return url;
}

export async function askClara(message, responseMode, { config, signal, fetchImpl = fetch, origin = location.href }) {
  const text = message.trim();
  if (!text || text.length > 4000) throw new Error('Scrivi una richiesta da 1 a 4000 caratteri.');
  if (!['voice', 'text'].includes(responseMode)) throw new Error('Scegli il tipo di risposta.');
  if (!config.assistantEndpoint) {
    return { demo: true, reply: 'Questo è un esempio di risposta, per provare la nuova scrivania. Puoi scegliere se leggermi o ascoltarmi. Il servizio Clara non è ancora collegato: non ho elaborato la tua richiesta né creato o salvato materiali.' };
  }
  const endpoint = resolveEndpoint(config.assistantEndpoint, origin);
  const response = await fetchImpl(endpoint, {
    method: 'POST', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ message: text, responseMode }),
  });
  if (!response.ok) throw new Error(response.status === 401 ? 'Accedi a Clara per continuare.' : 'Clara non riesce a rispondere in questo momento. Riprova.');
  const result = await response.json();
  if (typeof result.reply !== 'string' || !result.reply.trim() || result.reply.length > 20000) {
    throw new Error('La risposta ricevuta non è valida. Riprova.');
  }
  return { demo: false, reply: result.reply };
}
