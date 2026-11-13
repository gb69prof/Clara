import {createServer} from 'node:http';
import {openLocalDatabase,handleLocalRequest,localDatabasePath} from '../lib/clara-local.mjs';

const port=Number(process.env.CLARA_LOCAL_PORT||4177);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Porta locale non valida.');
const db=openLocalDatabase();
const server=createServer(async(req,res)=>{
  try{
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>100000){res.writeHead(413,{'Content-Type':'text/plain'});res.end('Richiesta troppo grande.');return;}chunks.push(chunk);}
    const body=Buffer.concat(chunks);
    const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body})});
    const response=await handleLocalRequest(request,db,port);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500,{'Content-Type':'text/plain'});res.end('Richiesta non disponibile.');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`La porta ${port} è già occupata. Apri http://127.0.0.1:${port}/ oppure chiudi l'altra istanza.`:error.message);db.close();process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{console.log(`Clara bis pronta sul PC: http://127.0.0.1:${port}/`);console.log(`Archivio persistente: ${localDatabasePath}`);console.log('Chiudi questa finestra o premi Ctrl+C per arrestare. Lo stato dell’esecutore programmato è indicato nella scrivania.');});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>{db.close();process.exit(0);}));
