import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import type { ProceduralAssetBundle, SemanticPart } from '../integrations/commerce/proceduralAssets'

type Point3 = [number, number, number]
type Mat4 = Float32Array
type RendererMode = 'loading-texture' | 'semantic-webgl' | 'semantic-webgl-fallback' | 'canvas-fallback' | 'unavailable'

type SemanticStyle = { color: Point3; textureWeight: number }

const VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_texcoord;
  attribute vec3 a_color;
  attribute float a_texture_weight;

  uniform mat4 u_model;
  uniform mat4 u_mvp;

  varying vec3 v_normal;
  varying vec2 v_texcoord;
  varying vec3 v_color;
  varying float v_texture_weight;

  void main() {
    gl_Position = u_mvp * vec4(a_position, 1.0);
    v_normal = normalize(mat3(u_model) * a_normal);
    v_texcoord = a_texcoord;
    v_color = a_color;
    v_texture_weight = a_texture_weight;
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform vec3 u_light_direction;

  varying vec3 v_normal;
  varying vec2 v_texcoord;
  varying vec3 v_color;
  varying float v_texture_weight;

  void main() {
    vec3 normal = normalize(v_normal);
    vec3 light = normalize(u_light_direction);
    float diffuse = max(dot(normal, light), 0.0);
    float halfLambert = diffuse * 0.5 + 0.5;
    float rim = pow(1.0 - max(normal.z, 0.0), 2.0) * 0.15;
    float highlight = pow(max(dot(normal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 30.0) * 0.14;
    vec4 albedo = texture2D(u_texture, v_texcoord);
    vec3 textured = albedo.rgb * v_color;
    vec3 surface = mix(v_color, textured, clamp(v_texture_weight, 0.0, 1.0));
    vec3 lit = surface * (0.24 + halfLambert * 0.74) + surface * rim + vec3(highlight);
    gl_FragColor = vec4(lit, 1.0);
  }
`

function hexRgb(hex: string): Point3 {
  const value = Number.parseInt(hex.slice(1), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

function mixColor(a: Point3, b: Point3, amount: number): Point3 {
  return [
    a[0] * (1 - amount) + b[0] * amount,
    a[1] * (1 - amount) + b[1] * amount,
    a[2] * (1 - amount) + b[2] * amount,
  ]
}

function styleForPart(bundle: ProceduralAssetBundle, part: SemanticPart): SemanticStyle {
  const key = `${part.name} ${part.role}`.toLowerCase()
  const primary = hexRgb(bundle.preview.primaryColor)
  const secondary = hexRgb(bundle.preview.secondaryColor)

  if (bundle.preview.preset === 'earth-guardian') {
    if (key.includes('display-base')) return { color: [0.18, 0.24, 0.31], textureWeight: 0 }
    if (key.includes('continent')) return { color: [0.3, 0.82, 0.42], textureWeight: 0.1 }
    if (key.includes('cloud')) return { color: [0.96, 0.99, 1], textureWeight: 0 }
    if (key.includes('arms') || key.includes('hands')) return { color: [0.91, 0.97, 1], textureWeight: 0 }
    if (key.includes('legs') || key.includes('boots')) return { color: [0.12, 0.2, 0.27], textureWeight: 0 }
    return { color: [1, 1, 1], textureWeight: 1 }
  }

  if (key.includes('ice') || key.includes('freeboard') || key.includes('cryo')) return { color: [0.88, 0.98, 1], textureWeight: 0.72 }
  if (key.includes('water-surface') || key.includes('surface-water')) return { color: [0.2, 0.68, 0.88], textureWeight: 0.7 }
  if (key.includes('bathymetry') || key.includes('trench') || key.includes('seabed')) return { color: [0.17, 0.42, 0.58], textureWeight: 0.76 }
  if (key.includes('terrain') || key.includes('paleochannel') || key.includes('flow')) return { color: [0.78, 0.56, 0.28], textureWeight: 0.78 }
  if (key.includes('earth-jpl') || key.includes('earth-body')) return { color: [1, 1, 1], textureWeight: 1 }
  if (key.includes('solar')) return { color: [0.08, 0.2, 0.38], textureWeight: 0.12 }
  if (key.includes('steel') || key.includes('mast') || key.includes('gnss') || key.includes('lidar') || key.includes('radar') || key.includes('auv') || key.includes('buoy') || key.includes('instrument') || key.includes('crawler') || key.includes('bucket')) {
    return { color: [0.52, 0.62, 0.68], textureWeight: 0.08 }
  }
  if (key.includes('grid') || key.includes('lattice') || key.includes('ring') || key.includes('observation')) return { color: secondary, textureWeight: 0.06 }
  return { color: mixColor(primary, secondary, 0.18), textureWeight: 0.72 }
}

function buildSemanticArrays(bundle: ProceduralAssetBundle) {
  const vertexCount = bundle.preview.positions.length / 3
  const colors = new Float32Array(vertexCount * 3)
  const textureWeights = new Float32Array(vertexCount)
  const primary = hexRgb(bundle.preview.primaryColor)
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    colors.set(primary, vertex * 3)
    textureWeights[vertex] = 0.8
  }

  const assign = (start: number, count: number, style: SemanticStyle) => {
    const end = Math.min(vertexCount, start + count)
    for (let vertex = Math.max(0, start); vertex < end; vertex += 1) {
      colors.set(style.color, vertex * 3)
      textureWeights[vertex] = style.textureWeight
    }
  }

  for (const part of bundle.semanticParts) {
    const style = styleForPart(bundle, part)
    assign(part.vertexStart, part.vertexCount, style)

    // Forge procedural exporter v1 historically grouped the globe and the four
    // eye spheres into one semantic part. Split those deterministic ranges in
    // the preview so the face is not painted with the Earth map.
    if (bundle.preview.preset === 'earth-guardian' && part.name === 'earth-character-body' && part.vertexCount >= 1257) {
      const globeVertices = 693
      const whiteEyeVertices = 330
      const pupilVertices = 234
      assign(part.vertexStart, globeVertices, { color: [1, 1, 1], textureWeight: 1 })
      assign(part.vertexStart + globeVertices, whiteEyeVertices, { color: [0.96, 0.99, 1], textureWeight: 0 })
      assign(part.vertexStart + globeVertices + whiteEyeVertices, pupilVertices, { color: [0.015, 0.035, 0.055], textureWeight: 0 })
    }
  }

  return { colors, textureWeights }
}

function meshBounds(positions: number[]) {
  const minimum: Point3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const maximum: Point3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  for (let index = 0; index < positions.length; index += 3) {
    minimum[0] = Math.min(minimum[0], positions[index])
    minimum[1] = Math.min(minimum[1], positions[index + 1])
    minimum[2] = Math.min(minimum[2], positions[index + 2])
    maximum[0] = Math.max(maximum[0], positions[index])
    maximum[1] = Math.max(maximum[1], positions[index + 1])
    maximum[2] = Math.max(maximum[2], positions[index + 2])
  }
  const center: Point3 = [
    (minimum[0] + maximum[0]) / 2,
    (minimum[1] + maximum[1]) / 2,
    (minimum[2] + maximum[2]) / 2,
  ]
  let radius = 0
  for (let index = 0; index < positions.length; index += 3) {
    radius = Math.max(radius, Math.hypot(positions[index] - center[0], positions[index + 1] - center[1], positions[index + 2] - center[2]))
  }
  return { center, radius: radius || 1 }
}

function multiply(a: Mat4, b: Mat4): Mat4 {
  const output = new Float32Array(16)
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0
      for (let inner = 0; inner < 4; inner += 1) value += a[inner * 4 + row] * b[column * 4 + inner]
      output[column * 4 + row] = value
    }
  }
  return output
}

function translation(x: number, y: number, z: number): Mat4 {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1])
}

function scaling(x: number, y: number, z: number): Mat4 {
  return new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1])
}

function rotationX(angle: number): Mat4 {
  const c = Math.cos(angle), s = Math.sin(angle)
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1])
}

function rotationY(angle: number): Mat4 {
  const c = Math.cos(angle), s = Math.sin(angle)
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1])
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(280, rect.width)
  const height = Math.max(300, rect.height)
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5)
  const drawingWidth = Math.round(width * pixelRatio)
  const drawingHeight = Math.round(height * pixelRatio)
  if (canvas.width !== drawingWidth || canvas.height !== drawingHeight) {
    canvas.width = drawingWidth
    canvas.height = drawingHeight
  }
  return { width, height, drawingWidth, drawingHeight, pixelRatio }
}

function shader(gl: WebGLRenderingContext, kind: number, source: string) {
  const value = gl.createShader(kind)
  if (!value) throw new Error('WebGL shader allocation failed')
  gl.shaderSource(value, source)
  gl.compileShader(value)
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value) || 'Shader compilation failed')
  return value
}

function programFor(gl: WebGLRenderingContext) {
  const vertex = shader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!program) throw new Error('WebGL program allocation failed')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Program link failed')
  return program
}

function attribute(gl: WebGLRenderingContext, program: WebGLProgram, name: string, size: number, values: Float32Array) {
  const location = gl.getAttribLocation(program, name)
  const buffer = gl.createBuffer()
  if (location < 0 || !buffer) throw new Error(`WebGL attribute unavailable: ${name}`)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0)
  return buffer
}

function validBundle(bundle: ProceduralAssetBundle) {
  const vertices = bundle.preview.positions.length / 3
  return vertices > 0
    && bundle.preview.normals.length === bundle.preview.positions.length
    && bundle.preview.texcoords.length === vertices * 2
    && bundle.preview.indices.length > 0
    && bundle.preview.positions.every(Number.isFinite)
    && bundle.preview.normals.every(Number.isFinite)
}

export function EnhancedProceduralAssetViewer({ bundle, stale = false }: { bundle: ProceduralAssetBundle; stale?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef({ yaw: -0.55, pitch: -0.24 })
  const zoomRef = useRef(1)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const [rotating, setRotating] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const rotatingRef = useRef(rotating)
  const [rendererMode, setRendererMode] = useState<RendererMode>('loading-texture')
  const [zoomLabel, setZoomLabel] = useState(100)
  const semantic = useMemo(() => buildSemanticArrays(bundle), [bundle])

  useEffect(() => { rotatingRef.current = rotating }, [rotating])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!validBundle(bundle) || typeof window.WebGLRenderingContext === 'undefined') {
      setRendererMode('unavailable')
      return
    }

    const gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: true })
    if (!gl) {
      setRendererMode('unavailable')
      return
    }

    let disposed = false
    let frame = 0
    let objectUrl: string | null = null
    let image: HTMLImageElement | null = null
    const buffers: WebGLBuffer[] = []
    let texture: WebGLTexture | null = null
    let program: WebGLProgram | null = null

    try {
      program = programFor(gl)
      gl.useProgram(program)
      buffers.push(attribute(gl, program, 'a_position', 3, new Float32Array(bundle.preview.positions)))
      buffers.push(attribute(gl, program, 'a_normal', 3, new Float32Array(bundle.preview.normals)))
      buffers.push(attribute(gl, program, 'a_texcoord', 2, new Float32Array(bundle.preview.texcoords)))
      buffers.push(attribute(gl, program, 'a_color', 3, semantic.colors))
      buffers.push(attribute(gl, program, 'a_texture_weight', 1, semantic.textureWeights))

      const maximumIndex = bundle.preview.indices.reduce((maximum, value) => Math.max(maximum, value), 0)
      const uint32 = maximumIndex > 65_535
      if (uint32 && !gl.getExtension('OES_element_index_uint')) throw new Error('32-bit element indices unsupported')
      const indexData = uint32 ? new Uint32Array(bundle.preview.indices) : new Uint16Array(bundle.preview.indices)
      const indexBuffer = gl.createBuffer()
      if (!indexBuffer) throw new Error('Index buffer allocation failed')
      buffers.push(indexBuffer)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW)

      texture = gl.createTexture()
      if (!texture) throw new Error('Texture allocation failed')
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)

      const modelLocation = gl.getUniformLocation(program, 'u_model')
      const mvpLocation = gl.getUniformLocation(program, 'u_mvp')
      const lightLocation = gl.getUniformLocation(program, 'u_light_direction')
      const textureLocation = gl.getUniformLocation(program, 'u_texture')
      if (modelLocation === null || mvpLocation === null || lightLocation === null || textureLocation === null) throw new Error('WebGL uniform unavailable')
      gl.uniform1i(textureLocation, 0)
      gl.uniform3f(lightLocation, -0.42, 0.76, 0.56)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      gl.clearColor(0.004, 0.024, 0.059, 1)

      const { center, radius } = meshBounds(bundle.preview.positions)

      const begin = (mode: RendererMode) => {
        setRendererMode(mode)
        let last = performance.now()
        const draw = (time: number) => {
          if (disposed || !program) return
          const { width, height, drawingWidth, drawingHeight } = resizeCanvas(canvas)
          gl.viewport(0, 0, drawingWidth, drawingHeight)
          if (rotatingRef.current && !dragRef.current) angleRef.current.yaw += Math.min(32, time - last) * 0.00032
          last = time
          const fit = (0.82 * zoomRef.current) / radius
          const aspect = width >= height ? scaling(height / width, 1, 1) : scaling(1, width / height, 1)
          const centered = multiply(scaling(fit, fit, fit), translation(-center[0], -center[1], -center[2]))
          const model = multiply(rotationY(angleRef.current.yaw), multiply(rotationX(angleRef.current.pitch), centered))
          const mvp = multiply(aspect, model)
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
          gl.useProgram(program)
          gl.uniformMatrix4fv(modelLocation, false, model)
          gl.uniformMatrix4fv(mvpLocation, false, mvp)
          gl.drawElements(gl.TRIANGLES, indexData.length, uint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0)
          frame = requestAnimationFrame(draw)
        }
        frame = requestAnimationFrame(draw)
      }

      const bytes = Uint8Array.from(bundle.texture.bytes)
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: bundle.texture.mimeType }))
      image = new Image()
      image.decoding = 'async'
      image.onload = () => {
        if (disposed || !texture || !image) return
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        gl.generateMipmap(gl.TEXTURE_2D)
        const anisotropic = gl.getExtension('EXT_texture_filter_anisotropic')
        if (anisotropic) {
          const maximum = Number(gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) || 1
          gl.texParameterf(gl.TEXTURE_2D, anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maximum))
        }
        begin('semantic-webgl')
      }
      image.onerror = () => {
        if (disposed || !texture) return
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]))
        begin('semantic-webgl-fallback')
      }
      image.src = objectUrl
    } catch {
      setRendererMode('unavailable')
    }

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      if (image) { image.onload = null; image.onerror = null }
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      for (const buffer of buffers) gl.deleteBuffer(buffer)
      if (texture) gl.deleteTexture(texture)
      if (program) gl.deleteProgram(program)
    }
  }, [bundle, semantic])

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return
    const deltaX = event.clientX - dragRef.current.x
    const deltaY = event.clientY - dragRef.current.y
    angleRef.current.yaw -= deltaX * 0.012
    angleRef.current.pitch = Math.max(-1.1, Math.min(0.65, angleRef.current.pitch - deltaY * 0.008))
    dragRef.current = { x: event.clientX, y: event.clientY }
  }

  function pointerUp() { dragRef.current = null }

  function setZoom(next: number) {
    zoomRef.current = Math.max(0.5, Math.min(1.65, next))
    setZoomLabel(Math.round(zoomRef.current * 100))
  }

  function wheel(event: ReactWheelEvent<HTMLCanvasElement>) {
    event.preventDefault()
    setZoom(zoomRef.current - event.deltaY * 0.0007)
  }

  const rendererLabel = rendererMode === 'semantic-webgl'
    ? 'SEMANTIC PBR PREVIEW'
    : rendererMode === 'semantic-webgl-fallback'
      ? 'SEMANTIC MATERIAL FALLBACK'
      : rendererMode === 'canvas-fallback'
        ? 'CANVAS 2D FALLBACK'
        : rendererMode === 'unavailable'
          ? 'PREVIEW UNAVAILABLE'
          : 'LOADING TEXTURE'

  return (
    <div className={`procedural-viewer ${stale ? 'is-stale' : ''}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Rotating semantic preview of ${bundle.preview.label}, rendered from the exported glTF geometry using ${rendererLabel.toLowerCase()}`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onWheel={wheel}
        style={{ touchAction: 'none' }}
      />
      <div className="procedural-viewer__hud">
        <span><b>{rendererLabel}</b> · {bundle.preview.label} · zoom {zoomLabel}%</span>
        <button type="button" onClick={() => setZoom(zoomRef.current - 0.12)} aria-label="Zoom out 3D preview">−</button>
        <button type="button" onClick={() => setZoom(zoomRef.current + 0.12)} aria-label="Zoom in 3D preview">＋</button>
        <button type="button" onClick={() => setRotating(value => !value)}>{rotating ? 'Pause rotation' : 'Resume rotation'}</button>
      </div>
      <div className="procedural-viewer__fingerprint">{bundle.geometryFingerprint} · {bundle.texture.fingerprint}</div>
      {stale ? <div className="procedural-viewer__stale"><b>Configuration changed</b><span>Generate again to keep preview and export linked.</span></div> : null}
    </div>
  )
}
