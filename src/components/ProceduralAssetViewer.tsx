import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, MutableRefObject } from 'react'
import type { ProceduralAssetBundle } from '../integrations/commerce/proceduralAssets'

type Point3 = [number, number, number]
type Mat4 = Float32Array
type RendererMode = 'loading-texture' | 'webgl-textured' | 'webgl-material-fallback' | 'canvas-fallback' | 'unavailable'

const VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_texcoord;

  uniform mat4 u_model;
  uniform mat4 u_mvp;

  varying vec3 v_normal;
  varying vec2 v_texcoord;

  void main() {
    gl_Position = u_mvp * vec4(a_position, 1.0);
    v_normal = normalize(mat3(u_model) * a_normal);
    v_texcoord = a_texcoord;
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform vec3 u_light_direction;

  varying vec3 v_normal;
  varying vec2 v_texcoord;

  void main() {
    vec3 normal = normalize(v_normal);
    vec3 light = normalize(u_light_direction);
    float diffuse = max(dot(normal, light), 0.0);
    float halfLambert = diffuse * 0.5 + 0.5;
    float rim = pow(1.0 - max(normal.z, 0.0), 2.0) * 0.14;
    float highlight = pow(max(dot(normal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 28.0) * 0.12;
    vec4 albedo = texture2D(u_texture, v_texcoord);
    vec3 lit = albedo.rgb * (0.24 + halfLambert * 0.72) + albedo.rgb * rim + vec3(highlight);
    gl_FragColor = vec4(lit, albedo.a);
  }
`

function rgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function mix(a: number[], b: number[], amount: number, shade: number) {
  return `rgb(${a.map((value, index) => Math.round((value * (1 - amount) + b[index] * amount) * shade)).join(' ')})`
}

function rotate(point: Point3, yaw: number, pitch: number): Point3 {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const x = point[0] * cy - point[2] * sy
  const z = point[0] * sy + point[2] * cy
  return [x, point[1] * cp - z * sp, point[1] * sp + z * cp]
}

function normal(a: Point3, b: Point3, c: Point3): Point3 {
  const ab: Point3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ac: Point3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const vector: Point3 = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ]
  const length = Math.hypot(...vector) || 1
  return [vector[0] / length, vector[1] / length, vector[2] / length]
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
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ])
}

function scaling(x: number, y: number, z: number): Mat4 {
  return new Float32Array([
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1,
  ])
}

function rotationX(angle: number): Mat4 {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return new Float32Array([
    1, 0, 0, 0,
    0, cosine, sine, 0,
    0, -sine, cosine, 0,
    0, 0, 0, 1,
  ])
}

function rotationY(angle: number): Mat4 {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return new Float32Array([
    cosine, 0, -sine, 0,
    0, 1, 0, 0,
    sine, 0, cosine, 0,
    0, 0, 0, 1,
  ])
}

function meshBounds(positions: number[]) {
  const minimum: Point3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const maximum: Point3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  for (let index = 0; index < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      minimum[axis] = Math.min(minimum[axis], positions[index + axis])
      maximum[axis] = Math.max(maximum[axis], positions[index + axis])
    }
  }
  const center: Point3 = [
    (minimum[0] + maximum[0]) / 2,
    (minimum[1] + maximum[1]) / 2,
    (minimum[2] + maximum[2]) / 2,
  ]
  let radius = 0
  for (let index = 0; index < positions.length; index += 3) {
    radius = Math.max(radius, Math.hypot(
      positions[index] - center[0],
      positions[index + 1] - center[1],
      positions[index + 2] - center[2],
    ))
  }
  return { center, radius: radius || 1 }
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

function createShader(gl: WebGLRenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind)
  if (!shader) throw new Error('WebGL shader allocation failed')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'WebGL shader compilation failed'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw new Error('WebGL program allocation failed')
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'WebGL program link failed'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
}

function bindAttribute(gl: WebGLRenderingContext, program: WebGLProgram, name: string, size: number, values: Float32Array) {
  const location = gl.getAttribLocation(program, name)
  const buffer = gl.createBuffer()
  if (location < 0 || !buffer) throw new Error(`WebGL attribute unavailable: ${name}`)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0)
  return buffer
}

function hasCompletePreviewData(bundle: ProceduralAssetBundle) {
  const { positions, normals, texcoords, indices } = bundle.preview
  const vertices = positions.length / 3
  return positions.length > 0
    && positions.length % 3 === 0
    && normals.length === positions.length
    && texcoords.length === vertices * 2
    && indices.length > 0
    && indices.length % 3 === 0
    && positions.every(Number.isFinite)
    && normals.every(Number.isFinite)
    && texcoords.every(Number.isFinite)
}

function startCanvasFallback(
  canvas: HTMLCanvasElement,
  bundle: ProceduralAssetBundle,
  angleRef: MutableRefObject<{ yaw: number; pitch: number }>,
  dragRef: MutableRefObject<{ x: number; y: number } | null>,
  rotatingRef: MutableRefObject<boolean>,
) {
  if (typeof window.CanvasRenderingContext2D === 'undefined') return null
  const maybeContext = canvas.getContext('2d')
  if (!maybeContext) return null
  const context: CanvasRenderingContext2D = maybeContext
  const positions = bundle.preview.positions
  const indices = bundle.preview.indices
  const { center } = meshBounds(positions)
  const xs = positions.filter((_, index) => index % 3 === 0)
  const ys = positions.filter((_, index) => index % 3 === 1)
  const zs = positions.filter((_, index) => index % 3 === 2)
  const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs)) || 1
  const primary = rgb(bundle.preview.primaryColor)
  const secondary = rgb(bundle.preview.secondaryColor)
  let animationFrame = 0
  let lastTime = performance.now()

  function draw(time: number) {
    const { width, height, pixelRatio } = resizeCanvas(canvas)
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    if (rotatingRef.current && !dragRef.current) angleRef.current.yaw += Math.min(32, time - lastTime) * 0.00032
    lastTime = time

    const background = context.createRadialGradient(width * 0.5, height * 0.48, 5, width * 0.5, height * 0.5, width * 0.7)
    background.addColorStop(0, '#0c2740')
    background.addColorStop(0.55, '#041327')
    background.addColorStop(1, '#010611')
    context.fillStyle = background
    context.fillRect(0, 0, width, height)

    context.save()
    context.strokeStyle = 'rgba(91, 220, 255, .12)'
    context.lineWidth = 1
    for (let row = 0; row < 8; row += 1) {
      const y = height * 0.72 + row * row * 1.5
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(width, y)
      context.stroke()
    }
    for (let column = -8; column <= 8; column += 1) {
      context.beginPath()
      context.moveTo(width / 2 + column * 24, height * 0.72)
      context.lineTo(width / 2 + column * 68, height)
      context.stroke()
    }
    const glow = context.createRadialGradient(width / 2, height * 0.74, 3, width / 2, height * 0.74, width * 0.3)
    glow.addColorStop(0, `rgba(${secondary.join(',')},.38)`)
    glow.addColorStop(1, `rgba(${secondary.join(',')},0)`)
    context.fillStyle = glow
    context.beginPath()
    context.ellipse(width / 2, height * 0.74, width * 0.31, height * 0.08, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()

    const scale = Math.min(width * 0.66, height * 0.7) / extent
    const transformed: Point3[] = []
    for (let index = 0; index < positions.length; index += 3) {
      transformed.push(rotate([positions[index] - center[0], positions[index + 1] - center[1], positions[index + 2] - center[2]], angleRef.current.yaw, angleRef.current.pitch))
    }
    const triangles: Array<{ points: Point3[]; depth: number; index: number }> = []
    for (let index = 0; index < indices.length; index += 3) {
      const points = [transformed[indices[index]], transformed[indices[index + 1]], transformed[indices[index + 2]]]
      triangles.push({ points, depth: (points[0][2] + points[1][2] + points[2][2]) / 3, index: index / 3 })
    }
    triangles.sort((a, b) => a.depth - b.depth)
    const light: Point3 = [-0.35, 0.7, 0.62]
    for (const triangle of triangles) {
      const faceNormal = normal(triangle.points[0], triangle.points[1], triangle.points[2])
      const illumination = Math.max(0.34, Math.min(1.06, 0.55 + (faceNormal[0] * light[0] + faceNormal[1] * light[1] + faceNormal[2] * light[2]) * 0.5))
      const secondaryAmount = triangle.index % 11 < 2 ? 0.72 : Math.max(0.08, (faceNormal[0] + 1) * 0.16)
      context.beginPath()
      triangle.points.forEach((point, index) => {
        const x = width / 2 + point[0] * scale
        const y = height * 0.53 - point[1] * scale
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.closePath()
      context.fillStyle = mix(primary, secondary, secondaryAmount, illumination)
      context.fill()
      context.strokeStyle = `rgba(${secondary.join(',')},.13)`
      context.stroke()
    }
    animationFrame = window.requestAnimationFrame(draw)
  }

  animationFrame = window.requestAnimationFrame(draw)
  return () => window.cancelAnimationFrame(animationFrame)
}

export function ProceduralAssetViewer({ bundle, stale = false }: { bundle: ProceduralAssetBundle; stale?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef({ yaw: -0.55, pitch: -0.24 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const [rotating, setRotating] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const rotatingRef = useRef(rotating)
  const [rendererMode, setRendererMode] = useState<RendererMode>('loading-texture')

  useEffect(() => {
    rotatingRef.current = rotating
  }, [rotating])

  useEffect(() => {
    const currentCanvas = canvasRef.current
    if (!currentCanvas) return
    const canvas: HTMLCanvasElement = currentCanvas
    let disposed = false
    let animationFrame = 0
    let objectUrl: string | null = null
    let image: HTMLImageElement | null = null
    let fallbackCleanup: (() => void) | null = null
    let gl: WebGLRenderingContext | null = null
    let program: WebGLProgram | null = null
    let texture: WebGLTexture | null = null
    const buffers: WebGLBuffer[] = []

    function startFallback() {
      if (disposed) return
      fallbackCleanup = startCanvasFallback(canvas, bundle, angleRef, dragRef, rotatingRef)
      setRendererMode(fallbackCleanup ? 'canvas-fallback' : 'unavailable')
    }

    if (!hasCompletePreviewData(bundle) || typeof window.WebGLRenderingContext === 'undefined') {
      startFallback()
      return () => fallbackCleanup?.()
    }

    gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: true })
    if (!gl) {
      startFallback()
      return () => fallbackCleanup?.()
    }

    try {
      program = createProgram(gl)
      gl.useProgram(program)
      buffers.push(bindAttribute(gl, program, 'a_position', 3, new Float32Array(bundle.preview.positions)))
      buffers.push(bindAttribute(gl, program, 'a_normal', 3, new Float32Array(bundle.preview.normals)))
      buffers.push(bindAttribute(gl, program, 'a_texcoord', 2, new Float32Array(bundle.preview.texcoords)))

      const maximumIndex = bundle.preview.indices.reduce((maximum, value) => Math.max(maximum, value), 0)
      const canUseUint32 = maximumIndex <= 65_535 || Boolean(gl.getExtension('OES_element_index_uint'))
      if (!canUseUint32) throw new Error('This WebGL device cannot draw 32-bit mesh indices')
      const indexData = maximumIndex <= 65_535 ? new Uint16Array(bundle.preview.indices) : new Uint32Array(bundle.preview.indices)
      const indexBuffer = gl.createBuffer()
      if (!indexBuffer) throw new Error('WebGL index buffer allocation failed')
      buffers.push(indexBuffer)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW)

      texture = gl.createTexture()
      if (!texture) throw new Error('WebGL texture allocation failed')
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
      if (!modelLocation || !mvpLocation || !lightLocation || !textureLocation) throw new Error('WebGL uniform unavailable')
      gl.uniform1i(textureLocation, 0)
      gl.uniform3f(lightLocation, -0.42, 0.76, 0.56)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      gl.clearColor(0.004, 0.024, 0.059, 1)

      const { center, radius } = meshBounds(bundle.preview.positions)
      const textureBytes = Uint8Array.from(bundle.texture.bytes)
      objectUrl = URL.createObjectURL(new Blob([textureBytes], { type: bundle.texture.mimeType }))
      image = new Image()
      image.decoding = 'async'

      function enableAnisotropicFiltering() {
        if (!gl) return
        const anisotropic = gl.getExtension('EXT_texture_filter_anisotropic')
          ?? gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
          ?? gl.getExtension('MOZ_EXT_texture_filter_anisotropic')
        if (!anisotropic) return
        const maximum = Number(gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) || 1
        gl.texParameterf(gl.TEXTURE_2D, anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maximum))
      }

      function startWebglAnimation(mode: 'webgl-textured' | 'webgl-material-fallback') {
        if (!gl || !program || disposed) return
        setRendererMode(mode)
        let lastTime = performance.now()

        function draw(time: number) {
          if (disposed || !gl || !program) return
          const { width, height, drawingWidth, drawingHeight } = resizeCanvas(canvas)
          gl.viewport(0, 0, drawingWidth, drawingHeight)
          if (rotatingRef.current && !dragRef.current) angleRef.current.yaw += Math.min(32, time - lastTime) * 0.00032
          lastTime = time

          const fit = 0.82 / radius
          const aspectProjection = width >= height
            ? scaling(height / width, 1, 1)
            : scaling(1, width / height, 1)
          const centered = multiply(scaling(fit, fit, fit), translation(-center[0], -center[1], -center[2]))
          const model = multiply(rotationY(angleRef.current.yaw), multiply(rotationX(angleRef.current.pitch), centered))
          const mvp = multiply(aspectProjection, model)

          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
          gl.useProgram(program)
          gl.uniformMatrix4fv(modelLocation, false, model)
          gl.uniformMatrix4fv(mvpLocation, false, mvp)
          gl.drawElements(gl.TRIANGLES, indexData.length, maximumIndex <= 65_535 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, 0)
          animationFrame = window.requestAnimationFrame(draw)
        }

        animationFrame = window.requestAnimationFrame(draw)
      }

      image.onload = () => {
        if (disposed || !gl || !program || !texture || !image) return
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        gl.generateMipmap(gl.TEXTURE_2D)
        enableAnisotropicFiltering()
        startWebglAnimation('webgl-textured')
      }
      image.onerror = () => {
        if (disposed || !gl || !texture) return
        const fallbackRgb = rgb(bundle.preview.primaryColor)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([...fallbackRgb, 255]))
        startWebglAnimation('webgl-material-fallback')
      }
      image.src = objectUrl
    } catch {
      queueMicrotask(() => {
        if (!disposed) setRendererMode('unavailable')
      })
    }

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      fallbackCleanup?.()
      if (image) {
        image.onload = null
        image.onerror = null
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      if (gl) {
        for (const buffer of buffers) gl.deleteBuffer(buffer)
        if (texture) gl.deleteTexture(texture)
        if (program) gl.deleteProgram(program)
      }
    }
  }, [bundle])

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

  function pointerUp() {
    dragRef.current = null
  }

  const rendererLabel = rendererMode === 'webgl-textured'
    ? 'TEXTURED WEBGL'
    : rendererMode === 'webgl-material-fallback'
      ? 'WEBGL MATERIAL FALLBACK'
      : rendererMode === 'canvas-fallback'
        ? 'CANVAS 2D FALLBACK'
        : rendererMode === 'unavailable'
          ? 'PREVIEW UNAVAILABLE'
          : 'LOADING PNG TEXTURE'

  return (
    <div className={`procedural-viewer ${stale ? 'is-stale' : ''}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Rotating live preview of ${bundle.preview.label}, rendered from the exported glTF geometry using ${rendererLabel.toLowerCase()}`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        style={{ touchAction: 'none' }}
      />
      <div className="procedural-viewer__hud">
        <span><b>{rendererLabel}</b> · {bundle.preview.label}</span>
        <button type="button" onClick={() => setRotating(value => !value)}>{rotating ? 'Pause rotation' : 'Resume rotation'}</button>
      </div>
      <div className="procedural-viewer__fingerprint">{bundle.geometryFingerprint} · {bundle.texture.fingerprint}</div>
      {stale ? <div className="procedural-viewer__stale"><b>Configuration changed</b><span>Generate again to keep preview and export linked.</span></div> : null}
    </div>
  )
}
