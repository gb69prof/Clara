import {agentInstructions} from '../../../../lib/clara-agent.mjs';
export function GET(){return Response.json(agentInstructions,{headers:{'Cache-Control':'private, no-store'}});}
