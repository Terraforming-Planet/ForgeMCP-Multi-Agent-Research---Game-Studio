export type OwnerCubePromptId = 'king' | 'queen' | 'bishop' | 'rook' | 'knight' | 'pawn' | 'classic-board' | 'lab-ledcolor-board' | 'cube-512-board'

export interface OwnerCubePrompt {
  id: OwnerCubePromptId
  label: string
  prompt: string
}

export const OWNER_CUBE_SOURCE = {
  authorization: 'OWNER_AUTHORIZED_PRIVATE_SOURCE' as const,
  scope: ['3D modelling', 'PBR texturing', 'visual QA', 'computer-opponent training methodology'] as const,
  publicationRule: 'Use the private Arena Chess repository as an internal training/reference source only. Never publish its private files, secrets, raw training artefacts or URLs from this public ForgeMCP repository.',
  opponentRule: 'Reuse legal self-play, deterministic search and difficulty methodology; game rules remain authoritative and must not be replaced by a learned policy.',
}

const COMMON = `Production target: a premium chess asset for Cube Chess, readable at gameplay camera distance and under close 3/4 inspection. Preserve unmistakable chess identity before adding style. Center the mesh at X=0 Z=0 with the board-contact plane at Y=0, keep the entire base inside one square, use consistent real-world scale across the set, outward normals, watertight visible shell where practical, no floating fragments, no accidental self-intersections and no decorative geometry that changes gameplay footprint. Create clean non-overlapping UVs with texel-density consistency. Author a physically based material set with BaseColor, Normal, Roughness, Metallic/AO where useful and a separate Emissive mask for LED areas. The material must still read correctly with emissive intensity set to zero. Produce LOD0/LOD1/LOD2, collision separate from presentation geometry, GLB/glTF export, vertex/triangle counts, bounds, pivot/orientation report and SHA-256 provenance manifest. Render QA from front, side, rear, top and 3/4 views plus a full-board readability shot. Reject the asset if silhouette, centering, board clearance, UVs or material response are ambiguous.`

export const OWNER_CUBE_PROMPTS: OwnerCubePrompt[] = [
  {
    id: 'king',
    label: 'Król Premium',
    prompt: `${COMMON}\n\nKING: Build a tall Staunton-derived king with a broad weighted base, controlled stepped foot, tapered faceted torso inspired by Czech Cubism 1911–1914, a distinct collar and a clearly readable crown/cross finial. The cross must be robust rather than needle-thin and remain recognizable from top view. Use subtle bevels so highlights reveal the facets instead of razor-sharp shading artefacts. Add a recessed LED channel around the lower collar only; never let LEDs overpower the king silhouette. Dark side: graphite/obsidian PBR with restrained blue-green emissive accents. Light side: ivory/mineral PBR with matching cooler emissive accents.`,
  },
  {
    id: 'queen',
    label: 'Hetman Premium',
    prompt: `${COMMON}\n\nQUEEN: Create an elegant Staunton queen with a wide stable base, slimmer waist than the king, rising shoulder/collar and a deep, unmistakable crown with evenly spaced points surrounding a central top element. Preserve an immediately different silhouette from the king. Use Czech-Cubist planar transitions on the body, softened by small bevels. Put emissive detail inside the crown recess and a thin lower ring only. Avoid spikes, fantasy horns or a crown so dense that it aliases at gameplay distance.`,
  },
  {
    id: 'bishop',
    label: 'Goniec Premium',
    prompt: `${COMMON}\n\nBISHOP: Keep classic bishop hierarchy and a single clean diagonal mitre cut that remains visible from gameplay camera angles. Use a graceful taper, faceted shoulder planes and a compact polished head. The mitre cut must be actual geometry with clean topology, not a painted stripe. Add one narrow emissive seam below the head. Do not turn the bishop into a spear, crystal or generic cone.`,
  },
  {
    id: 'rook',
    label: 'Wieża Premium',
    prompt: `${COMMON}\n\nROOK: Build a low, powerful tournament rook with a heavy multi-step base, slightly tapered tower and clearly separated battlements. Use 6–8 robust crenellations with enough negative space to read from above. Facet the tower surfaces without losing the castle identity. Add a recessed emissive groove under the battlement ring. No sci-fi antennae, thin fins or ornamental pieces outside the square footprint.`,
  },
  {
    id: 'knight',
    label: 'Koń Premium · poprawiona twarz i grzywa',
    prompt: `${COMMON}\n\nKNIGHT — HIGHEST PRIORITY: Create a refined classic chess knight, not a generic horse statue. The silhouette must show a strong S-curve from chest through neck to head, a clearly defined forehead, cheek, muzzle and jaw, two anatomical ears, nostrils and a subtle eye plane. Keep the head slightly bowed forward like a high-quality Staunton knight. Center the mass above the base so it does not lean off-square. Sculpt a continuous central mane following the rear neck. For the Lab LEDColor variant, divide only the mane into closely spaced rounded crayon-like facets using the full colour spectrum; these elements must follow the mane flow and must never look like random spikes, antennas or a mohawk floating away from the neck. Add enough supporting topology around muzzle, ears, eye ridge and mane roots to keep smooth shading stable. Preserve a clean readable face at 3/4 view. Use controlled leather/stone micro-normal detail on the body and a separate slightly glossier material on the coloured mane. LED emission belongs in a thin base ring, not on the eyes or face.`,
  },
  {
    id: 'pawn',
    label: 'Pion Premium',
    prompt: `${COMMON}\n\nPAWN: Use classic Staunton proportions: broad weighted base, smooth rising body, short neck and a perfectly centered spherical head. Maintain generous bevels and smooth curvature while retaining subtle faceted transitions consistent with the set. No character face, horns or extra ornament. Use a very restrained base LED ring and fine stone/resin microstructure.`,
  },
  {
    id: 'classic-board',
    label: 'Plansza Classic Black & White',
    prompt: `${COMMON}\n\nCLASSIC BOARD: Create a premium 8×8 tournament board with exactly 64 coplanar playable squares, alternating deep black and warm off-white. Give the board a substantial beveled frame, realistic contact shadows and physically plausible stone/ebonized-wood response. Avoid pure #000/#fff clipping; preserve roughness variation and subtle micro-surface detail. No emissive grid in the default classic mode. Square coordinates and playable bounds must be exact and exported in metadata.`,
  },
  {
    id: 'lab-ledcolor-board',
    label: 'Plansza Lab LEDColor',
    prompt: `${COMMON}\n\nLAB LEDCOLOR BOARD: Start from an exact playable 8×8 board and add controllable colour zones as separate material parameters: dark squares, light squares, frame, player-one pieces, player-two pieces and legal/capture indicators. Put LEDs in recessed frame channels and optional thin square-edge guides, never as a flat glow over the whole surface. Support intensity 0–100%, hue selection and emissive bloom-safe values. The board must remain readable with all LEDs disabled.`,
  },
  {
    id: 'cube-512-board',
    label: 'Cube Chess 512 · 8×8×8',
    prompt: `${COMMON}\n\nCUBE 512 BOARD: Build eight perfectly registered 8×8 playable levels for exactly 512 addresses. Use thin transparent or translucent level plates with rigid corner supports and clear vertical separation so every square remains selectable. Add level identifiers and subtle edge lighting without obscuring pieces behind the current layer. Export authoritative level/square transforms and bounds; verify alignment from top, front and diagonal views and verify that no level shifts relative to the 8×8×8 coordinate system.`,
  },
]

export const OWNER_OPPONENT_TRAINING_PLAN = [
  'Start from the existing legal Cube/Chess rules and deterministic baseline; never learn legality from examples.',
  'Generate legal self-play positions and search targets with reproducible seeds; record full move histories and termination reasons.',
  'Train/evaluate whole-army coordination signals separately from authoritative move generation, then gate every candidate through the legal-move generator.',
  'Keep Easy / Medium / Hard profiles measurable: bounded search/time/noise for lower levels, deeper deterministic search and reviewed auxiliary guidance for higher levels.',
  'Benchmark human-facing strength on fixed suites plus unseen legal positions; report win/draw/loss, illegal-move count (must be zero), node/time budgets and regressions.',
  'Only mark a neural/auxiliary opponent model as loaded after an exported artefact, runtime compatibility check and in-game verification are present.',
] as const
