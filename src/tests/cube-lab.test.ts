import { describe,expect,it } from 'vitest'
import { createCandidate,executeGame,promoteCandidate,rollbackCandidate,runTournament } from '../integrations/cube/lab'
describe('authoritative Cube lab',()=>{
 it('executes only engine-generated legal replay moves',()=>{const game=executeGame(7,'baseline-v1','candidate-capture-v1',20);expect(game.moves).toHaveLength(20);expect(game.moves.every(m=>m.legal)).toBe(true);expect(game.illegalMoves).toBe(0);expect(game.engineVersion).toHaveLength(40)})
 it('executes requested paired tournament games',()=>{const c=createCandidate('paired');const t=runTournament(c.id,4,512);expect(t.gamesCompleted).toBe(4);expect(t.games[0]?.whitePolicy).not.toBe(t.games[1]?.whitePolicy);expect(t.illegalMoves).toBe(0)})
 it('gates promotion and preserves reversible baseline',()=>{const c=createCandidate('gate'),t=runTournament(c.id,2,1);expect(promoteCandidate(c.id,t,false).status).toBe('AWAITING_APPROVAL');if(t.thresholdPass){expect(promoteCandidate(c.id,t,true).status).toBe('PASS');expect(rollbackCandidate(c.id,true)).toMatchObject({status:'PASS',baselinePreserved:true})}})
})
