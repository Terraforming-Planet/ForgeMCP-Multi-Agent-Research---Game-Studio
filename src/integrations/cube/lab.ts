import { Board3D, Coordinate3D, evaluatePosition, generateLegalMovesForColor } from './engine/index.js'
import type { Move, Piece, PieceColor } from './engine/index.js'

export const CUBE_ENGINE_COMMIT = '9543accfcef8f8786c32aed282aa63e49ad27615'
export const CUBE_ENGINE_SOURCE = 'https://github.com/teslaeco/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer'

export type PolicyKind = 'baseline-v1' | 'candidate-capture-v1'
export interface ReplayMove { ply:number; side:PieceColor; pieceId:string; from:string; to:string; capture?:string; legal:true; evaluationBefore:number; evaluationAfter:number }
export interface GameRecord { gameId:string; seed:number; openingId:string; whitePolicy:PolicyKind; blackPolicy:PolicyKind; moves:ReplayMove[]; result:'WHITE_WIN'|'BLACK_WIN'|'DRAW'; termination:'CHECKMATE'|'STALEMATE'|'PLY_LIMIT'; illegalMoves:number; materialLossProxy:number; moveTimeMs:number; positionDiversity:number; engineVersion:string }
export interface Tournament { status:'PASS'|'WARNING'; requestedGames:number; gamesCompleted:number; wins:number; draws:number; losses:number; illegalMoves:number; averageMoveTimeMs:number; moveDiversity:number; checkmates:number; games:GameRecord[]; methodology:string; candidateId:string; thresholdPass:boolean; regressionPass:boolean }
export interface Candidate { id:string; policy:PolicyKind; state:'CREATED'|'EVALUATED'|'PROMOTED'|'ROLLED_BACK'; createdAt:string }

const candidates = new Map<string,Candidate>()
let activePolicy: PolicyKind = 'baseline-v1'
let previousPolicy: PolicyKind = 'baseline-v1'

function initialPieces(): Piece[] {
  const rank: Piece['type'][]=['rook','knight','bishop','queen','king','bishop','knight','rook']
  const out: Piece[]=[]
  for(let x=0;x<8;x++) {
    out.push({id:`white-${rank[x]}-${x}`,color:'white',type:rank[x]!,position:new Coordinate3D(x,0,0),hasMoved:false})
    out.push({id:`white-pawn-${x}`,color:'white',type:'pawn',position:new Coordinate3D(x,1,0),hasMoved:false})
    out.push({id:`black-pawn-${x}`,color:'black',type:'pawn',position:new Coordinate3D(x,6,0),hasMoved:false})
    out.push({id:`black-${rank[x]}-${x}`,color:'black',type:rank[x]!,position:new Coordinate3D(x,7,0),hasMoved:false})
  }
  return out
}
const values:Record<Piece['type'],number>={pawn:1,knight:3,bishop:3,rook:5,queen:9,king:100}
function evalBoard(board:Board3D,side:PieceColor){return board.getAllPieces().reduce((s,p)=>s+(p.color===side?1:-1)*values[p.type],0)}
function hash(seed:number, ply:number, text:string){let h=(seed^((ply+1)*2654435761))>>>0; for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0; return h}
function selectMove(board:Board3D,moves:Move[],policy:PolicyKind,seed:number,ply:number):Move {
  const sorted=[...moves].sort((a,b)=>`${a.pieceId}${a.to.toSquareAddress()}`.localeCompare(`${b.pieceId}${b.to.toSquareAddress()}`))
  if(policy==='candidate-capture-v1') sorted.sort((a,b)=>(b.capturedPieceId?values[board.getPieceAt(b.to)!.type]:0)-(a.capturedPieceId?values[board.getPieceAt(a.to)!.type]:0))
  const best=policy==='candidate-capture-v1' && sorted[0]?.capturedPieceId ? sorted.filter(m=>m.capturedPieceId && values[board.getPieceAt(m.to)!.type]===values[board.getPieceAt(sorted[0]!.to)!.type]) : sorted
  return best[hash(seed,ply,best.map(m=>m.pieceId).join(''))%best.length]!
}

export function executeGame(seed:number,whitePolicy:PolicyKind,blackPolicy:PolicyKind,maxPlies=40):GameRecord {
  const board=new Board3D(initialPieces()); let side:PieceColor='white'; const moves:ReplayMove[]=[]; const positions=new Set<string>(); let loss=0
  for(let ply=0;ply<maxPlies;ply++) {
    const status=evaluatePosition(board,side)
    if(status.kind==='checkmate') return finish(status.winner==='white'?'WHITE_WIN':'BLACK_WIN','CHECKMATE')
    if(status.kind==='stalemate') return finish('DRAW','STALEMATE')
    const legal=generateLegalMovesForColor(board,side); const before=evalBoard(board,side); const selected=selectMove(board,legal,side==='white'?whitePolicy:blackPolicy,seed,ply)
    const from=selected.from.toSquareAddress(),to=selected.to.toSquareAddress(); board.applyMove(selected); const after=evalBoard(board,side); loss+=Math.max(0,before-after)
    moves.push({ply:ply+1,side,pieceId:selected.pieceId,from,to,...(selected.capturedPieceId?{capture:selected.capturedPieceId}:{}),legal:true,evaluationBefore:before,evaluationAfter:after}); positions.add(board.getAllPieces().map(p=>`${p.id}:${p.position.toSquareAddress()}`).sort().join('|')); side=side==='white'?'black':'white'
  }
  return finish('DRAW','PLY_LIMIT')
  function finish(result:GameRecord['result'],termination:GameRecord['termination']):GameRecord{return {gameId:`g-${seed}-${whitePolicy}-${blackPolicy}`,seed,openingId:`seed-${seed}`,whitePolicy,blackPolicy,moves,result,termination,illegalMoves:0,materialLossProxy:loss,moveTimeMs:0,positionDiversity:positions.size,engineVersion:CUBE_ENGINE_COMMIT}}
}

export function createCandidate(id=`candidate-${Date.now()}`):Candidate { const c:Candidate={id,policy:'candidate-capture-v1',state:'CREATED',createdAt:new Date().toISOString()}; candidates.set(id,c); return c }
export function runTournament(candidateId:string,gameCount=4,seed=42):Tournament {
  const c=candidates.get(candidateId); if(!c) throw new Error('Candidate not found'); const n=Math.max(2,Math.min(8,gameCount+(gameCount%2)))
  const games=Array.from({length:n},(_,i)=>executeGame(seed+Math.floor(i/2),i%2===0?c.policy:'baseline-v1',i%2===0?'baseline-v1':c.policy))
  let wins=0,losses=0,draws=0; for(const g of games){const candidateWhite=g.whitePolicy===c.policy; if(g.result==='DRAW')draws++; else if((g.result==='WHITE_WIN')===candidateWhite)wins++; else losses++}
  c.state='EVALUATED'; const illegalMoves=games.reduce((s,g)=>s+g.illegalMoves,0); const thresholdPass=illegalMoves===0 && wins>=losses
  return {status:thresholdPass?'PASS':'WARNING',requestedGames:gameCount,gamesCompleted:games.length,wins,draws,losses,illegalMoves,averageMoveTimeMs:0,moveDiversity:new Set(games.flatMap(g=>g.moves.map(m=>`${m.pieceId}:${m.from}-${m.to}`))).size,checkmates:games.filter(g=>g.termination==='CHECKMATE').length,games,methodology:'Candidate vs baseline; deterministic paired seeds with side swap; 40-ply cap; capture-weighted material proxy. No Elo claimed.',candidateId,thresholdPass,regressionPass:illegalMoves===0}
}
export function promoteCandidate(candidateId:string,t:Tournament,humanApproved:boolean){const c=candidates.get(candidateId); if(!c)return {status:'FAIL',reason:'Candidate not found'}; if(!t.thresholdPass||!t.regressionPass)return {status:'FAIL',reason:'Benchmark or legality/regression gate failed'}; if(!humanApproved)return {status:'AWAITING_APPROVAL',reason:'Explicit human approval required'}; previousPolicy=activePolicy; activePolicy=c.policy;c.state='PROMOTED';return {status:'PASS',activePolicy}}
export function rollbackCandidate(candidateId:string,humanApproved:boolean){const c=candidates.get(candidateId);if(!c)return {status:'FAIL',reason:'Candidate not found'};if(!humanApproved)return {status:'AWAITING_APPROVAL',reason:'Explicit human approval required'};activePolicy=previousPolicy;c.state='ROLLED_BACK';return {status:'PASS',activePolicy,baselinePreserved:true}}
