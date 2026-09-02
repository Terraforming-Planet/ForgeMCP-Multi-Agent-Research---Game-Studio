import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ProceduralAssetBundle } from '../integrations/commerce/proceduralAssets'

type Point3 = [number, number, number]

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

export function ProceduralAssetViewer({ bundle, stale = false }: { bundle: ProceduralAssetBundle; stale?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const angleRef = useRef({ yaw: -0.55, pitch: -0.24 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const [rotating, setRotating] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const canvas = canvasRef.current!
    if (!canvas) return
    if (typeof window.CanvasRenderingContext2D === 'undefined') return
    const context = canvas.getContext('2d')!
    if (!context) return
    const positions = bundle.preview.positions
    const indices = bundle.preview.indices
    const xs = positions.filter((_, index) => index % 3 === 0)
    const ys = positions.filter((_, index) => index % 3 === 1)
    const zs = positions.filter((_, index) => index % 3 === 2)
    const center: Point3 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2]
    const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs)) || 1
    const primary = rgb(bundle.preview.primaryColor)
    const secondary = rgb(bundle.preview.secondaryColor)
    let lastTime = performance.now()

    function draw(time: number) {
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(280, rect.width)
      const height = Math.max(300, rect.height)
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
        canvas.width = Math.round(width * pixelRatio)
        canvas.height = Math.round(height * pixelRatio)
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      if (rotating && !dragRef.current) angleRef.current.yaw += Math.min(32, time - lastTime) * 0.00032
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
      frameRef.current = window.requestAnimationFrame(draw)
    }
    frameRef.current = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frameRef.current)
  }, [bundle, rotating])

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return
    angleRef.current.yaw += (event.clientX - dragRef.current.x) * 0.012
    angleRef.current.pitch = Math.max(-1.1, Math.min(0.65, angleRef.current.pitch + (event.clientY - dragRef.current.y) * 0.008))
    dragRef.current = { x: event.clientX, y: event.clientY }
  }

  function pointerUp() {
    dragRef.current = null
  }

  return (
    <div className={`procedural-viewer ${stale ? 'is-stale' : ''}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Rotating live preview of ${bundle.preview.label}, rendered from the exported glTF geometry`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      />
      <div className="procedural-viewer__hud">
        <span><b>LIVE GEOMETRY</b> · {bundle.preview.label}</span>
        <button type="button" onClick={() => setRotating(value => !value)}>{rotating ? 'Pause rotation' : 'Resume rotation'}</button>
      </div>
      <div className="procedural-viewer__fingerprint">{bundle.geometryFingerprint}</div>
      {stale ? <div className="procedural-viewer__stale"><b>Configuration changed</b><span>Generate again to keep preview and export linked.</span></div> : null}
    </div>
  )
}
