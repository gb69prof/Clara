import {env} from 'cloudflare:workers';
import {readState,clientState} from '../../../lib/clara-store.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(clientState(await readState(env.DB)),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Archivio temporaneamente non disponibile. Riprova.'},{status:503});}}
