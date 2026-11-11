import { pageHtml } from '../lib/clara-ui';
export const dynamic='force-dynamic';
export function GET(){return new Response(pageHtml,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
