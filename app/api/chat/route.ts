import {env} from 'cloudflare:workers';
import {createChat,readChat} from '../../../lib/clara-chat.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request){
  try{return Response.json({chat:await readChat(env.DB,new URL(request.url).searchParams.get('id'))},{headers});}
  catch{return Response.json({error:'Richiesta scaduta o non trovata.'},{status:404,headers});}
}
export async function POST(request:Request){
  if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'Origine non consentita.'},{status:403,headers});
  if(!request.headers.get('Content-Type')?.includes('application/json'))return Response.json({error:'Formato non valido.'},{status:415,headers});
  try{
    const raw=await request.text();
    if(raw.length>20000)return Response.json({error:'Richiesta troppo lunga.'},{status:413,headers});
    const data=JSON.parse(raw);
    return Response.json({chat:await createChat(env.DB,data)},{headers});
  }catch(error){return Response.json({error:error instanceof Error?error.message:'Richiesta non valida.'},{status:400,headers});}
}
