export type BasicGamePresetInput = 'auto' | 'classic' | 'earth' | 'sahara' | 'arctic' | 'ocean' | 'nebula'
export type BasicGamePreset = Exclude<BasicGamePresetInput, 'auto'> | 'prompt-palette'
export type BasicGameOpponentInput = 'auto' | 'human' | 'deterministic-computer'
export type BasicGameOpponent = 'human' | 'deterministic-baseline-v1'
export type BasicGamePieceFamily = 'classic-staunton' | 'earth-guardian' | 'czech-facet' | 'crayon-cathedral' | 'lab-ledcolor'

export type BasicGameTheme = {
  id: BasicGamePreset
  label: string
  accent: string
  secondary: string
  glow: string
  summary: string
  boardPreset: 'classic-mono' | 'lab-ledcolor'
}

export type BasicGameBlueprint = {
  schema: 'forgemcp.basic-game.v1'
  version: '1.0.0'
  id: `game-${string}`
  generator: 'ForgeMCP local template generator v1'
  generatedLocally: true
  prompt: string
  normalizedPrompt: string
  seed: number
  title: string
  preset: BasicGamePreset
  opponent: BasicGameOpponent
  pieceFamily: BasicGamePieceFamily
  theme: BasicGameTheme
  ruleset: {
    id: 'capture-chess-8x8-v1'
    boardSize: 8
    winCondition: 'Capture the opposing king'
    supported: readonly ['standard piece geometry', 'alternating turns', 'captures', 'undo', 'reset']
    omitted: readonly ['check/checkmate', 'castling', 'en-passant', 'promotion']
  }
  interpretation: {
    recognizedFeatures: string[]
    promptRestrictedToWhitelist: true
    unrecognizedDetailsPreservedOnlyAsText: true
  }
  truthBoundary: string
}

export type BasicGameGeneratorInput = {
  prompt: string
  preset?: BasicGamePresetInput
  opponent?: BasicGameOpponentInput
}

export const DEFAULT_BASIC_GAME_PROMPT = 'Black-and-white orbital board with blue-green LED light'

const THEME_PRESETS: Record<Exclude<BasicGamePreset, 'prompt-palette'>, BasicGameTheme> = {
  classic: {
    id: 'classic',
    label: 'Classic monochrome',
    accent: '#d8e2f3',
    secondary: '#5de4ff',
    glow: 'rgba(93, 228, 255, 0.35)',
    summary: 'A black-and-white competition board with restrained cool edge lighting.',
    boardPreset: 'classic-mono',
  },
  earth: {
    id: 'earth',
    label: 'Earth orbit',
    accent: '#35f0a1',
    secondary: '#20bce8',
    glow: 'rgba(53, 240, 161, 0.46)',
    summary: 'Green-and-blue LEDs frame a black-and-white orbital research board.',
    boardPreset: 'lab-ledcolor',
  },
  sahara: {
    id: 'sahara',
    label: 'Sahara signal',
    accent: '#ffb34f',
    secondary: '#ff5b79',
    glow: 'rgba(255, 179, 79, 0.48)',
    summary: 'Amber desert tiles, coral signal light and a warm atmospheric glow.',
    boardPreset: 'lab-ledcolor',
  },
  arctic: {
    id: 'arctic',
    label: 'Arctic watch',
    accent: '#80ecff',
    secondary: '#d8fbff',
    glow: 'rgba(128, 236, 255, 0.46)',
    summary: 'Ice-blue edges, white sensor light and a cold cryosphere glow.',
    boardPreset: 'lab-ledcolor',
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean sentinel',
    accent: '#33c8ff',
    secondary: '#315dff',
    glow: 'rgba(51, 200, 255, 0.46)',
    summary: 'Cyan current lines, deep-blue pieces and a marine observation glow.',
    boardPreset: 'lab-ledcolor',
  },
  nebula: {
    id: 'nebula',
    label: 'Violet nebula',
    accent: '#b789ff',
    secondary: '#ff6fd8',
    glow: 'rgba(183, 137, 255, 0.5)',
    summary: 'Violet edges, magenta piece light and a soft nebula halo.',
    boardPreset: 'lab-ledcolor',
  },
}

export function normalizeGamePrompt(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl').slice(0, 1200)
}

export function hashGameText(value: string) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function promptMatches(prompt: string, terms: RegExp) {
  return terms.test(prompt)
}

function resolvePreset(prompt: string, requested: BasicGamePresetInput) {
  if (requested !== 'auto') return requested
  if (promptMatches(prompt, /sahara|desert|piasek|pustyn/)) return 'sahara'
  if (promptMatches(prompt, /arctic|polar|ice|l[oó]d|arkty/)) return 'arctic'
  if (promptMatches(prompt, /ocean|sea|morze|morsk/)) return 'ocean'
  if (promptMatches(prompt, /violet|purple|fiolet|nebula/)) return 'nebula'
  if (promptMatches(prompt, /earth|planet|orbital|ziemi|green|zielon/)) return 'earth'
  if (promptMatches(prompt, /classic|klasycz|monochrom|czarno.?bia/)) return 'classic'
  return 'prompt-palette'
}

function resolveOpponent(prompt: string, requested: BasicGameOpponentInput): BasicGameOpponent {
  if (requested === 'human') return 'human'
  if (requested === 'deterministic-computer') return 'deterministic-baseline-v1'
  return promptMatches(prompt, /komputer|computer|cpu|bot|przeciwnik.{0,12}(ai|agent)|agent.{0,12}przeciwnik/)
    ? 'deterministic-baseline-v1'
    : 'human'
}

function resolvePieceFamily(prompt: string, preset: BasicGamePreset): BasicGamePieceFamily {
  if (promptMatches(prompt, /earth guardian|stra[zż]nik.{0,8}ziemi/)) return 'earth-guardian'
  if (promptMatches(prompt, /crayon|kredk|cathedral|katedr/)) return 'crayon-cathedral'
  if (promptMatches(prompt, /czech|facet|faset|cubis|kubis/)) return 'czech-facet'
  if (promptMatches(prompt, /staunton|classic|klasycz/)) return 'classic-staunton'
  if (preset === 'earth') return 'earth-guardian'
  if (preset === 'sahara') return 'czech-facet'
  if (preset === 'nebula') return 'crayon-cathedral'
  if (preset === 'classic') return 'classic-staunton'
  return 'lab-ledcolor'
}

function promptPalette(seed: number): BasicGameTheme {
  const hue = seed % 360
  return {
    id: 'prompt-palette',
    label: 'Prompt palette',
    accent: `hsl(${hue} 86% 64%)`,
    secondary: `hsl(${(hue + 76) % 360} 84% 62%)`,
    glow: `hsl(${hue} 86% 64% / 0.45)`,
    summary: 'A deterministic colour palette derived locally from an otherwise unrecognized prompt.',
    boardPreset: 'lab-ledcolor',
  }
}

function recognizedFeatures(prompt: string, preset: BasicGamePreset, opponent: BasicGameOpponent, pieceFamily: BasicGamePieceFamily) {
  const features = [`theme:${preset}`, `pieces:${pieceFamily}`, `opponent:${opponent}`, 'rules:capture-chess-8x8-v1']
  if (promptMatches(prompt, /led|light|glow|[śs]wiat|pod[śs]wiet/)) features.push('lighting:led')
  if (promptMatches(prompt, /black.?and.?white|czarno.?bia|monochrom/)) features.push('board:monochrome')
  return features
}

export function generateBasicGameBlueprint(input: BasicGameGeneratorInput): BasicGameBlueprint {
  const prompt = input.prompt.trim().slice(0, 1200) || DEFAULT_BASIC_GAME_PROMPT
  const normalizedPrompt = normalizeGamePrompt(prompt)
  const requestedPreset = input.preset ?? 'auto'
  const requestedOpponent = input.opponent ?? 'auto'
  const preset = resolvePreset(normalizedPrompt, requestedPreset)
  const opponent = resolveOpponent(normalizedPrompt, requestedOpponent)
  const pieceFamily = resolvePieceFamily(normalizedPrompt, preset)
  const canonicalInput = JSON.stringify({ normalizedPrompt, requestedPreset, requestedOpponent, preset, opponent, pieceFamily })
  const seed = hashGameText(canonicalInput)
  const theme = preset === 'prompt-palette' ? promptPalette(seed) : THEME_PRESETS[preset]
  const fingerprint = hashGameText(JSON.stringify({ canonicalInput, theme }))

  return {
    schema: 'forgemcp.basic-game.v1',
    version: '1.0.0',
    id: `game-${fingerprint.toString(16).padStart(8, '0')}`,
    generator: 'ForgeMCP local template generator v1',
    generatedLocally: true,
    prompt,
    normalizedPrompt,
    seed,
    title: `${theme.label} · Capture Chess`,
    preset,
    opponent,
    pieceFamily,
    theme,
    ruleset: {
      id: 'capture-chess-8x8-v1',
      boardSize: 8,
      winCondition: 'Capture the opposing king',
      supported: ['standard piece geometry', 'alternating turns', 'captures', 'undo', 'reset'],
      omitted: ['check/checkmate', 'castling', 'en-passant', 'promotion'],
    },
    interpretation: {
      recognizedFeatures: recognizedFeatures(normalizedPrompt, preset, opponent, pieceFamily),
      promptRestrictedToWhitelist: true,
      unrecognizedDetailsPreservedOnlyAsText: true,
    },
    truthBoundary: 'This is a deterministic local game template, not free-form AI game generation, trained model inference, FIDE chess or the separate Cube Chess 8×8×8 engine.',
  }
}
