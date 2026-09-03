import type { ProceduralAssetBundle, SemanticPart } from '../commerce/proceduralAssets'

const GLOBE_VERTICES = 693
const EYE_VERTICES = 330
const PUPIL_VERTICES = 234
const GLOBE_INDICES = 3840
const EYE_INDICES = 1680
const PUPIL_INDICES = 1152

/**
 * Procedural exporter v1 created the Earth globe, two eye whites and two pupils
 * inside one historical semantic part. Split that known deterministic range
 * before PBR material repair so the exported glTF no longer paints the eyes
 * with the Earth texture.
 */
export function upgradeEarthGuardianSemantics(bundle: ProceduralAssetBundle): ProceduralAssetBundle {
  if (bundle.preview.preset !== 'earth-guardian') return bundle
  const body = bundle.semanticParts.find(part => part.name === 'earth-character-body')
  if (!body) return bundle

  const expectedVertices = GLOBE_VERTICES + EYE_VERTICES + PUPIL_VERTICES
  const expectedIndices = GLOBE_INDICES + EYE_INDICES + PUPIL_INDICES
  if (body.vertexCount < expectedVertices || body.indexCount < expectedIndices) return bundle

  const replacements: SemanticPart[] = [
    {
      name: 'earth-globe-body',
      role: 'stylized-earth-surface-not-satellite-evidence',
      vertexStart: body.vertexStart,
      vertexCount: GLOBE_VERTICES,
      indexStart: body.indexStart,
      indexCount: GLOBE_INDICES,
    },
    {
      name: 'guardian-eye-whites',
      role: 'character-face-white-material',
      vertexStart: body.vertexStart + GLOBE_VERTICES,
      vertexCount: EYE_VERTICES,
      indexStart: body.indexStart + GLOBE_INDICES,
      indexCount: EYE_INDICES,
    },
    {
      name: 'guardian-pupils',
      role: 'character-face-dark-material',
      vertexStart: body.vertexStart + GLOBE_VERTICES + EYE_VERTICES,
      vertexCount: PUPIL_VERTICES,
      indexStart: body.indexStart + GLOBE_INDICES + EYE_INDICES,
      indexCount: PUPIL_INDICES,
    },
  ]

  const semanticParts = bundle.semanticParts.flatMap(part => part === body ? replacements : [part])
  return {
    ...bundle,
    semanticParts,
    truthBoundary: `${bundle.truthBoundary} Earth Guardian face semantics are split so eye and pupil materials remain distinct from the generated Earth visualization texture.`,
  }
}
