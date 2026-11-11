import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {command,readState,clientState} from './clara-store.mjs';

export const appRoot=fileURLToPath(new URL('../',import.meta.url));
export const localDatabasePath=resolve(appRoot,'data-local/workspace.sqlite');
export function openLocalDatabase(filename=localDatabasePath){
  if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
  const sql=new DatabaseSync(filename);
  sql.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
  sql.exec('CREATE TABLE IF NOT EXISTS clarabis_workspace (id TEXT PRIMARY KEY NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)');
  return {close:()=>sql.close(),prepare(query){return {bind(...args){const statement=sql.prepare(query);return {async run(){return {meta:{changes:Number(statement.run(...args).changes)}};},async first(){return statement.get(...args)||null;}};}};}};
}
const assetTypes={'index.html':'text/html; charset=utf-8','app.js':'text/javascript; charset=utf-8','bridge.js':'text/javascript; charset=utf-8','styles.css':'text/css; charset=utf-8','favicon.svg':'image/svg+xml','assets/clara-reference.png':'image/png','assets/clara.webp':'image/webp'};
const operations=new Set(['create_project','edit_project','pause','cancel','approve','revise','save_memory','delete_memory','reset_all_projects','authorize_publication','revoke_publication']);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
const json=(value,status=200)=>Response.json(value,{status,headers});
export function localClientState(value){return {...clientState(value),capabilities:{...clientState(value).capabilities,localMode:true,aiAutonomous:false},localProjectDirectory:appRoot};}
export async function handleLocalRequest(request,db,port=4177){
  const url=new URL(request.url);
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!==String(port))return json({error:'Host non autorizzato.'},403);
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return json({error:'Origine non autorizzata.'},403);
  if(request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Richiesta esterna non autorizzata.'},403);
  try{
    if(request.method==='GET'&&url.pathname==='/api/health')return json({name:'Clara bis',version:'1.0.1',mode:'local',aiAutonomous:false});
    if(request.method==='GET'&&url.pathname==='/api/state')return json(localClientState(await readState(db)));
    if(request.method==='POST'&&url.pathname==='/api/command'){
      if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Richiesto JSON.'},415);
      const raw=await request.text();if(Buffer.byteLength(raw)>100000)return json({error:'Richiesta troppo grande.'},413);
      const payload=JSON.parse(raw);
      if(!operations.has(payload.op))return json({error:'Questa funzione richiede il collegamento dell’esecutore online. Puoi lavorare sull’incarico nella conversazione.'},400);
      const value=await command(db,payload);return json({...localClientState(value),projectId:value.projectId,artifactId:value.artifactId,reset:value.reset});
    }
    if(!['GET','HEAD'].includes(request.method))return json({error:'Metodo non disponibile.'},405);
    const asset=url.pathname==='/'?'index.html':url.pathname.slice(1);
    if(!Object.hasOwn(assetTypes,asset))return json({error:'Non trovato.'},404);
    return new Response(request.method==='HEAD'?null:readFileSync(resolve(appRoot,'public',asset)),{headers:{...headers,'Content-Type':assetTypes[asset]}});
  }catch(error){return json({error:error instanceof Error?error.message:'Operazione non riuscita.'},400);}
}
