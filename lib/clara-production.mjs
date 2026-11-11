// Production data is immutable per artifact. This module never deploys a site.
export const PRODUCTION_VERSION = '2.0.0';
export const RESET_CONFIRMATION = 'RESET_ALL_PROJECTS';
const fail = message => { throw new Error(message); };
const text = (value, max = 3000) => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : fail('Testo assente o troppo lungo.');
const list = (value, max = 50) => Array.isArray(value) && value.length <= max ? value : fail('Elenco non valido.');
const strings = value => list(value).map(x => text(x));
export const stamp = () => new Date().toISOString();
export async function commandFingerprint(value) {
  const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])) : v;
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), b=>b.toString(16).padStart(2,'0')).join('');
}
export function webUrl(value, kind) {
  let u; try { u = new URL(value); } catch { fail('URL non valido.'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || u.hash) fail('Richiesto un URL HTTPS senza credenziali, query o frammenti.');
  if (kind === 'preview' && !u.hostname.endsWith('.chatgpt.site')) fail('La consegna richiede una anteprima Sites.');
  if (kind === 'repository' && (u.hostname !== 'github.com' || !/^\/[\w.-]+\/[\w.-]+\/?$/.test(u.pathname))) fail('Repository GitHub non valido.');
  if (kind === 'publication' && u.hostname !== 'gbprof.it') fail('Destinazione consentita: https://gbprof.it/.');
  return u.href;
}
export function relativeFile(value) {
  const p = text(value, 300);
  if (p.includes('\\') || p.includes(':') || p.includes('\0') || p.startsWith('/') || p.split('/').some(x => !x || x === '.' || x === '..' || x.startsWith('.'))) fail('Percorso relativo non valido.');
  return p;
}
export function sha256(value) { return /^[a-f0-9]{64}$/.test(value) ? value : fail('SHA-256 non valido.'); }
export function fileRecords(value) {
  const records = list(value, 200).map(f => ({path:relativeFile(f.path), sha256:sha256(f.sha256)}));
  if (new Set(records.map(f => f.path.toLowerCase())).size !== records.length) fail('Percorsi duplicati nella consegna.');
  return records;
}
export function contractOf(c) {
  if (!c || typeof c !== 'object') fail('Completa il contratto prima di affidare il progetto.');
  const result = {goal:text(c.goal, 12000), scope:strings(c.scope), sources:strings(c.sources), deliverable:text(c.deliverable, 80), target:text(c.target, 500), acceptance:strings(c.acceptance), security:'Nessun dato identificativo degli studenti', publish_authorized:false};
  if (!result.scope.length || !result.acceptance.length) fail('Indica ambito e criteri di accettazione.');
  return result;
}
export function checkpointOf(c, p) {
  if (!c || typeof c !== 'object') fail('Serve un checkpoint strutturato con il prossimo passo.');
  return {project_id:p.id, run_id:p.runId || null, stage:text(p.stage, 160), created_at:stamp(), created_files:fileRecords(c.created_files || []), verified:strings(c.verified || []), not_verified:strings(c.not_verified || []), blockers:strings(c.blockers || []), next_action:text(c.next_action, 3000), publication_allowed:false};
}
export function deliveryOf(d) {
  if (!d || typeof d !== 'object') fail('Consegna file, commit, anteprima e riscontri del collaudo.');
  if (!/^[a-f0-9]{40}$/.test(d.commit)) fail('Indica il commit completo della consegna.');
  const files = fileRecords(d.files);
  if (!files.length) fail('La consegna deve contenere file reali.');
  if (files.some(f => f.path.split('/').at(-1).toLowerCase() === 'report.md')) fail('REPORT.md deve restare nel repository, fuori dai file da pubblicare.');
  const reportPath = relativeFile(d.reportPath);
  if (reportPath.split('/').at(-1) !== 'REPORT.md') fail('Indica il REPORT.md nel repository.');
  const entryPath = relativeFile(d.entryPath);
  if (!files.some(f => f.path === entryPath)) fail('Il file iniziale deve essere nella consegna.');
  const checkedAt = text(d.preview?.checkedAt, 50);
  if (!Number.isFinite(Date.parse(checkedAt)) || Date.parse(checkedAt) > Date.now() + 60000) fail('Data di verifica anteprima non valida.');
  const checks = list(d.checks, 50).map(c => {
    if (!['passed','failed','not_run'].includes(c.status)) fail('Esito di verifica non valido.');
    return {name:text(c.name, 160), status:c.status, evidence:text(c.evidence, 3000)};
  });
  if (!checks.length) fail('Registra almeno una verifica con riscontro.');
  return {repository:webUrl(d.repository,'repository'), commit:d.commit, files, entryPath, reportPath, preview:{url:webUrl(d.preview.url,'preview'), version:text(d.preview.version, 200), checkedAt}, checks, limitations:strings(d.limitations || []), verified:checks.every(c => c.status === 'passed')};
}
export function invalidateApproval(p) {
  delete p.approval; delete p.publication; delete p.approvedArtifactId;
}
export function latestVersion(p, versionId) {
  const artifact = p?.artifacts?.[0];
  if (!artifact || !versionId || artifact.id !== versionId) fail('La versione è cambiata: rileggi il progetto prima di confermare.');
  return artifact;
}
export function resetPreview(state, revision) {
  return {revision, epoch:state.projectEpoch || 0, counts:{projects:state.projects.length, versions:state.projects.reduce((n,p) => n + (p.artifacts?.length || 0),0), checkpoints:state.projects.reduce((n,p) => n + (p.checkpoints?.length || (p.checkpoint ? 1 : 0)),0), jobs:state.projects.filter(p => p.background || p.runId).length}};
}
export function resetProjects(state, c, revision) {
  if (c.confirm !== RESET_CONFIRMATION || !c.requestId) fail('Conferma esplicita e identificativo del reset richiesti.');
  if (!Number.isInteger(c.expectedRevision) || c.expectedRevision !== revision) fail('Archivio cambiato: rileggi il riepilogo prima del reset.');
  const preview = resetPreview(state, revision);
  state.projects = [];
  state.agentRequests = [];
  state.requests = [];
  state.projectEpoch = (state.projectEpoch || 0) + 1;
  // Old global logs did not tag their projects. Keep only identifiable entries
  // about the unaffected collections; drop project content and old agent outcomes.
  state.history = (state.history || []).filter(e => !e.projectId && /^(Memoria aggiornata:|Nota rimossa|Scadenza salvata:|Scadenza rimossa)/.test(e.text || ''));
  if (state.agent) state.agent = Object.fromEntries(['enabled','scheduleId','cadence','instructionsRevision'].filter(k => k in state.agent).map(k => [k,state.agent[k]]));
  state.lastProjectReset = {at:stamp(), epoch:state.projectEpoch, counts:preview.counts};
  state.history.unshift({text:'Reset definitivo degli incarichi eseguito.',at:stamp(),kind:'projects_reset'});
  return {reset:state.lastProjectReset};
}
export function requireEpoch(state, epoch) {
  if ((state.projectEpoch || 0) !== (epoch ?? 0)) fail('La scrivania è stata azzerata: rileggi lo stato prima di creare o acquisire incarichi.');
}
export function publicationGrant(p, c) {
  const a = latestVersion(p,c.versionId);
  if (p.status !== 'completato' || p.approval?.versionId !== a.id || c.confirm !== 'PUBLISH_EXACT_VERSION') fail('Servono approvazione e autorizzazione esplicita per questa versione.');
  if (!a.delivery?.verified) fail('Servono file, anteprima e verifiche superate per autorizzare la pubblicazione.');
  const destination = webUrl(c.destination,'publication');
  p.publication = {versionId:a.id, commit:a.delivery.commit, destination, authorizedAt:stamp(), grantId:crypto.randomUUID(), state:'authorized'};
  p.status = 'pronto'; p.stage = 'Pubblicazione autorizzata per questa versione';
  return p.publication;
}
export function publicationPreflight(p, c) {
  const a = latestVersion(p,c.versionId), grant = p.publication;
  if (p.status !== 'pronto' || !grant || grant.versionId !== a.id || grant.state !== 'authorized' || p.approval?.versionId !== a.id || !a.delivery?.verified || grant.commit !== a.delivery.commit) fail('Pubblicazione non autorizzata per questa versione.');
  return {grantId:grant.grantId, versionId:a.id, commit:grant.commit, destination:grant.destination, entryPath:a.delivery.entryPath, entrySha256:a.delivery.files.find(f => f.path === a.delivery.entryPath).sha256, files:a.delivery.files, exclude:['REPORT.md']};
}
export async function verifyPublication(preflight, fetcher = fetch) {
  const response = await fetcher(preflight.destination,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if (response.status !== 200 || !response.body) fail('Verifica HTTP della pubblicazione non superata.');
  const reader = response.body.getReader(), chunks=[]; let size=0;
  try { for (;;) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>2000000)fail('Pagina pubblicata troppo grande per la verifica.'); chunks.push(value); } } finally { await reader.cancel(); }
  const bytes=new Uint8Array(size); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==preflight.entrySha256)fail('Il contenuto pubblicato non corrisponde alla versione autorizzata.');
  const reportUrl=new URL('REPORT.md',preflight.destination).href;
  const report=await fetcher(reportUrl,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  await report.body?.cancel();
  if(![404,410].includes(report.status))fail('REPORT.md risulta accessibile o la sua esclusione non è verificabile.');
  return {grantId:preflight.grantId, checkedAt:stamp(), url:preflight.destination, status:response.status, sha256:hash, reportUrl, reportAbsent:true};
}
