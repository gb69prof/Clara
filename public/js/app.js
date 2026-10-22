import { config } from './config.js';
import { askClara, resolveEndpoint } from './assistant.js';

const $ = (id) => document.getElementById(id);
const form = $('composer');
const input = $('request');
const voiceButton = $('voice');
const status = $('status');
const playButton = $('play-reply');
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let recognition = null;
let listening = false;
let pending = false;
let requestController = null;
let replyText = '';
let speaking = false;
let speechVersion = 0;
let activeUtterance = null;

if (config.assistantEndpoint) $('preview-note').textContent = 'Le attività e le bozze restano soggette alla tua revisione.';
if (!Recognition || !window.isSecureContext) $('voice-help').textContent = 'Dettatura non disponibile qui. Puoi scrivere a Clara.';

function announce(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}

function stopSpeaking() {
  speechVersion++;
  if (canSpeak) window.speechSynthesis.cancel();
  activeUtterance = null;
  speaking = false;
  playButton.textContent = 'Ascolta risposta';
}

function speak(text) {
  stopSpeaking();
  if (!canSpeak) {
    announce('La lettura vocale non è disponibile in questo browser. Puoi leggere la risposta qui sotto.');
    return;
  }
  const version = speechVersion;
  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;
  utterance.lang = 'it-IT';
  const italianVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith('it'));
  if (italianVoice) utterance.voice = italianVoice;
  utterance.rate = 1;
  speaking = true;
  playButton.textContent = 'Interrompi voce';
  utterance.onend = () => {
    if (version !== speechVersion) return;
    speaking = false;
    activeUtterance = null;
    playButton.textContent = 'Ascolta risposta';
  };
  utterance.onerror = () => {
    if (version !== speechVersion) return;
    speaking = false;
    activeUtterance = null;
    playButton.textContent = 'Ascolta risposta';
    announce('L’audio non è partito. Tocca «Ascolta risposta» per riprovare.');
  };
  window.speechSynthesis.speak(utterance);
}

function updateControls() {
  $('send').disabled = pending || listening;
  voiceButton.disabled = pending;
  input.readOnly = pending || listening;
  form.setAttribute('aria-busy', String(pending));
  voiceButton.setAttribute('aria-pressed', String(listening));
  $('voice-title').textContent = listening ? 'Ti ascolto…' : 'Parla con Clara';
  if (Recognition && window.isSecureContext) $('voice-help').textContent = listening ? 'Tocca per interrompere e inviare.' : 'Tocca per parlare. Clara ti risponde a voce.';
  $('send').querySelector('span').textContent = pending ? 'Attendi…' : 'Invia';
}

async function submit(message, mode) {
  if (pending || !message.trim()) return;
  stopSpeaking();
  pending = true;
  updateControls();
  // Keep the previous answer hidden while a different request is in progress.
  $('reply').hidden = true;
  announce('Clara sta rispondendo…');
  const controller = new AbortController();
  requestController = controller;
  const timer = window.setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const result = await askClara(message, mode, { config, signal: controller.signal });
    if (controller.signal.aborted) return;
    replyText = result.reply;
    $('reply-text').textContent = replyText;
    $('reply-title').textContent = result.demo ? 'Clara · Risposta di esempio' : 'Clara';
    $('reply').hidden = false;
    playButton.hidden = !canSpeak;
    announce(result.demo ? 'Prova completata. La richiesta non è stata inviata a un servizio AI.' : 'La risposta di Clara è pronta.');
    if (mode === 'voice') speak(replyText);
  } catch (error) {
    announce(error.name === 'AbortError' ? 'Il servizio non ha risposto in tempo. La tua richiesta è ancora qui: puoi riprovare.' : error.message, true);
  } finally {
    window.clearTimeout(timer);
    requestController = null;
    pending = false;
    updateControls();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!input.value.trim()) { announce('Scrivi prima una richiesta.', true); input.focus(); return; }
  submit(input.value, new FormData(form).get('responseMode'));
});
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
});
playButton.addEventListener('click', () => speaking ? stopSpeaking() : speak(replyText));
form.addEventListener('change', () => { if (new FormData(form).get('responseMode') === 'text') stopSpeaking(); });

voiceButton.addEventListener('click', () => {
  if (pending) return;
  if (listening) { recognition?.stop(); return; }
  if (!Recognition || !window.isSecureContext) {
    announce('Questo browser non offre la dettatura in questa pagina. Scrivi la richiesta oppure usa il microfono della tastiera.');
    input.focus();
    return;
  }
  stopSpeaking();
  let transcript = '';
  let failed = false;
  const session = new Recognition();
  recognition = session;
  session.lang = 'it-IT';
  session.interimResults = false;
  session.continuous = false;
  session.onresult = (event) => {
    if (recognition !== session) return;
    transcript = Array.from(event.results).filter((result) => result.isFinal).map((result) => result[0].transcript).join(' ').trim();
  };
  session.onerror = (event) => {
    if (recognition !== session) return;
    failed = true;
    const errors = {
      'not-allowed': 'Il microfono non è autorizzato. Puoi abilitarlo nelle impostazioni del browser oppure scrivere.',
      'service-not-allowed': 'Il servizio di dettatura non è disponibile. Puoi scrivere la tua richiesta.',
      'audio-capture': 'Non trovo un microfono disponibile. Puoi scrivere la tua richiesta.',
      'no-speech': 'Non ho sentito parole. Tocca il microfono per riprovare.',
      network: 'La dettatura non riesce a collegarsi. Controlla la connessione o scrivi la richiesta.',
    };
    announce(errors[event.error] || 'La dettatura si è interrotta. Puoi riprovare o scrivere.', true);
  };
  session.onend = () => {
    if (recognition !== session) return;
    listening = false;
    recognition = null;
    updateControls();
    if (!failed && transcript) {
      // Never discard a draft: add the dictated request after existing text.
      input.value = [input.value.trim(), transcript].filter(Boolean).join('\n');
      submit(input.value, 'voice');
    } else if (!failed) announce('Non ho sentito parole. Puoi riprovare o scrivere.');
  };
  try {
    session.start();
    listening = true;
    updateControls();
    announce('Ti ascolto. La dettatura terminerà dopo una pausa.');
  } catch {
    recognition = null;
    listening = false;
    updateControls();
    announce('Non riesco ad avviare il microfono. Puoi scrivere la tua richiesta.', true);
  }
});

const areas = {
  lessons: { title: 'Lezioni', description: 'Una domanda da cui partire, un percorso da costruire. Qui ritroverai le tue lezioni e le attività per la classe.', prompt: 'Vorrei progettare una lezione su ' },
  materials: { title: 'Materiali', description: 'Testi, schede e risorse da ritrovare con semplicità, nello stesso posto.', prompt: 'Vorrei preparare un materiale per gli studenti su ' },
  projects: { title: 'Progetti', description: 'Uno spazio per dare forma alle idee, dai laboratori ai percorsi interattivi.', prompt: 'Vorrei organizzare un progetto didattico su ' },
};
let selectedArea = null;
let dialogTrigger = null;
const dialog = $('area-dialog');
document.querySelectorAll('[data-area]').forEach((button) => button.addEventListener('click', () => {
  const key = button.dataset.area;
  if (config.areas[key]) {
    try { window.location.assign(resolveEndpoint(config.areas[key], location.href)); }
    catch (error) { announce(error.message, true); }
    return;
  }
  selectedArea = areas[key];
  dialogTrigger = button;
  $('area-title').textContent = selectedArea.title;
  $('area-description').textContent = selectedArea.description;
  $('area-prompt').disabled = pending || listening;
  dialog.showModal();
}));
$('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => dialogTrigger?.focus());
$('area-prompt').addEventListener('click', () => {
  dialog.close();
  if (!input.value.trim()) input.value = selectedArea.prompt;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
});
window.addEventListener('pagehide', () => {
  requestController?.abort();
  const session = recognition;
  recognition = null;
  session?.abort();
  listening = false;
  stopSpeaking();
  updateControls();
});
