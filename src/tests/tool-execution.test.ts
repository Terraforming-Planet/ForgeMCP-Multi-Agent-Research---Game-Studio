import { afterEach,describe,expect,it,vi } from 'vitest'
import { getTool } from '../webmcp/registry'
describe('WebMCP execution safety',()=>{afterEach(()=>vi.restoreAllMocks())
 it('validates input before execution',async()=>{expect(await getTool('search_location')!.execute({query:'x'})).toMatchObject({state:'FAIL',verification:'FAIL'})})
 it('cannot fabricate success when dependency fails',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));expect(await getTool('search_location')!.execute({query:'Lake Chad'})).toMatchObject({state:'NOT_CONNECTED',verification:'INSUFFICIENT_DATA',provenance:[]})})
 it('requires literal human approval for promotion',async()=>{expect(await getTool('promote_ai_candidate')!.execute({candidateId:'x',tournament:{},humanApproved:false})).toMatchObject({state:'FAIL'})})
})
