import type { IntegrationHealth } from '../../types/core'

export const CUBE_PUBLIC_URL = 'https://terraforming-planet.github.io/Cube-Chess-512/'

export async function checkCubeHealth(): Promise<IntegrationHealth> {
  try {
    const response = await fetch(CUBE_PUBLIC_URL, { method: 'GET' })
    if (!response.ok) return 'DEGRADED'
    return 'CONNECTED'
  } catch {
    return 'NOT_CONNECTED'
  }
}

export async function inspectPosition(x: number, y: number, z: number) {
  const cubeConnection = await checkCubeHealth()
  return {
    isInsideBoard: x >= 1 && x <= 8 && y >= 1 && y <= 8 && z >= 1 && z <= 8,
    notation: `${String.fromCharCode(64 + x)}${y}-L${z}`,
    cubeConnection,
    sourceOfTruth: 'Cube Chess deterministic rules engine (external)',
    state: cubeConnection === 'CONNECTED' ? 'INSUFFICIENT_DATA' : 'NOT_CONNECTED',
  }
}
