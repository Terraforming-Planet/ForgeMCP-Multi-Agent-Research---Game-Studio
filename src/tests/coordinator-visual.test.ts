import { describe,expect,it } from 'vitest'
import { routeRequest,runVisualWorkflow } from '../coordinator/workflows'
import { decideVisualChange,proposeVisualChange,runVisualQa } from '../integrations/visual/workflow'
describe('coordinator and visual safety',()=>{
 it('routes deterministic intents',()=>{expect(routeRequest('environmental risk')).toBe('terra-risk');expect(routeRequest('LabMCP Test 001 Lake Kuchnia Toruń')).toBe('terra-labmcp-test-001');expect(routeRequest('self-play benchmark')).toBe('cube-selfplay');expect(routeRequest('improve visual readability')).toBe('visual-readability')})
 it('keeps previews reversible and upstream unchanged',async()=>{const p=proposeVisualChange();expect(p.reversible).toBe(true);expect(p.mutatesLiveGame).toBe(false);expect(runVisualQa(p).status).toBe('PASS');expect(decideVisualChange('APPROVE').liveGameMutated).toBe(false);expect((await runVisualWorkflow('readability')).state).toBe('WAITING_FOR_HUMAN')})
})
