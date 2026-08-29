import { z } from 'zod'

export const statusOutputSchema = z.object({
  status: z.enum(['READY', 'RUNNING', 'PASS', 'WARNING', 'FAIL', 'NOT_CONNECTED', 'AWAITING_APPROVAL']),
  message: z.string(),
  timestamp: z.string(),
})

export const locationSearchInputSchema = z.object({
  query: z.string().min(2).max(120),
})

export const locationSearchOutputSchema = z.object({
  state: z.enum(['CONNECTED', 'DEGRADED', 'NOT_CONNECTED', 'ERROR', 'UNKNOWN']),
  provider: z.string(),
  query: z.string(),
  results: z.array(
    z.object({
      displayName: z.string(),
      lat: z.number(),
      lon: z.number(),
    }),
  ),
})

export const stationSchema = z.object({
  name: z.string().min(1),
  aoi: z.string().min(1),
  coordinates: z.string().min(1),
  timespan: z.string().min(1),
  datasets: z.array(z.string()),
})

export const cubeInspectPositionInputSchema = z.object({
  x: z.number().int().min(1).max(8),
  y: z.number().int().min(1).max(8),
  z: z.number().int().min(1).max(8),
})

export const toolExecutionStateSchema = z.enum([
  'READY',
  'RUNNING',
  'PASS',
  'WARNING',
  'FAIL',
  'NOT_CONNECTED',
  'AWAITING_APPROVAL',
])

export const toolResponseWrapperSchema = z.object({
  state: toolExecutionStateSchema,
  data: z.unknown().optional(),
  error: z.string().optional(),
  verification: z.enum(['PASS', 'WARNING', 'FAIL', 'INSUFFICIENT_DATA']),
})
