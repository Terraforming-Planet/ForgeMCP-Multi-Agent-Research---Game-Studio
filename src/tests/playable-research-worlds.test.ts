import { describe, expect, it } from 'vitest'
import html from '../../public/playable-worlds/index.html?raw'

describe('playable research worlds V4', () => {
  it('keeps all four real Terra source applications linked', () => {
    expect(html).toContain('arctic-90n/real-ice-lab.html')
    expect(html).toContain('sahara-station/')
    expect(html).toContain('ocean-station/')
    expect(html).toContain('earth-space-512/')
    expect(html).toContain('REAL SOURCE APP + PLAYABLE 3D CONCEPT')
  })

  it('uses Earth Guardian as the playable character with separated visual materials', () => {
    expect(html).toContain("g.name='EarthGuardianV5'")
    expect(html).toContain('createEarthTexture')
    expect(html).toContain('Strażnik Ziemi V5')
    expect(html).toContain('oddzielnymi materiałami Ziemi, chmur, oczu, rękawic i butów')
  })

  it('supports full orbit camera distance control on desktop and mobile', () => {
    expect(html).toContain('camDist=clamp(camDist+delta,4,36)')
    expect(html).toContain("canvas.addEventListener('wheel'")
    expect(html).toContain("canvas.addEventListener('touchmove'")
    expect(html).toContain('ZOOM +')
    expect(html).toContain('ZOOM −')
  })

  it('generates real local geometry and textures and exposes guarded WebMCP tools', () => {
    expect(html).toContain('GLTFExporter')
    expect(html).toContain('makeRuntimeTexture')
    expect(html).toContain('generateRuntimeAsset')
    expect(html).toContain("name:'generate_runtime_3d_element'")
    expect(html).toContain("name:'set_station_camera'")
    expect(html).toContain('deterministic local generator; not a remote AI model')
  })

  it('keeps visualization and scientific evidence explicitly separated', () => {
    expect(html).toContain('Dowody Terra pozostają w źródłowych aplikacjach i oficjalnych danych')
    expect(html).toContain('3D scene is visualization only')
  })

  it('contains syntactically valid module JavaScript', () => {
    const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]
    expect(script).toBeTruthy()
    const withoutImports = script!.replace(/^import .*;$/gm, '')
    expect(() => new Function(`return (async () => {${withoutImports}})`)).not.toThrow()
  })
})
