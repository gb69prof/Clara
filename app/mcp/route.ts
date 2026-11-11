import {env,waitUntil} from 'cloudflare:workers';
import {handleMcp} from '../../lib/clara-mcp.mjs';
import {widgetHtml} from '../../lib/clara-ui';
export const dynamic='force-dynamic';
export const POST=(request:Request)=>handleMcp(request,env.DB,waitUntil,widgetHtml);
export const GET=(request:Request)=>handleMcp(request,env.DB,waitUntil,widgetHtml);
export const DELETE=(request:Request)=>handleMcp(request,env.DB,waitUntil,widgetHtml);
