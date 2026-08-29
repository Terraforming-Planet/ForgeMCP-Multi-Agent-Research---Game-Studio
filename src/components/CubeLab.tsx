import { useState } from 'react'
import { runCubeTrainingWorkflow } from '../coordinator/workflows'
import type { WorkflowRun } from '../types/core'
export function CubeLab(){const[run,setRun]=useState<WorkflowRun|null>(null);return <section className="card"><h2>Cube Computer-vs-Computer Training Lab</h2><p>Runs four actual legal games with paired deterministic seeds and a side swap. No Elo is claimed.</p><button type="button" onClick={async()=>setRun(await runCubeTrainingWorkflow('Run judge benchmark'))}>Execute 4-game benchmark</button><pre>{JSON.stringify(run?.result??{state:'READY'},null,2)}</pre><p>Promotion requires benchmark, legality/regression, and explicit human approval.</p></section>}
