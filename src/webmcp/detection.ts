import { webmcpTools } from './registry'

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string
        description: string
        inputSchema: Record<string, unknown>
        outputSchema: Record<string, unknown>
        execute?: (input: unknown) => Promise<unknown>
      }) => Promise<void> | void
    }
  }
}

export type WebMcpAvailability = 'WEBMCP_AVAILABLE' | 'WEBMCP_PARTIALLY_AVAILABLE' | 'WEBMCP_UNAVAILABLE'

export function detectWebMcpAvailability(): WebMcpAvailability {
  if (typeof document === 'undefined') return 'WEBMCP_UNAVAILABLE'
  const maybe = document.modelContext
  if (!maybe) return 'WEBMCP_UNAVAILABLE'
  if (typeof maybe.registerTool === 'function') return 'WEBMCP_AVAILABLE'
  return 'WEBMCP_PARTIALLY_AVAILABLE'
}

let registeredContext: Document['modelContext'] | undefined
let registrationPromise: Promise<{ availability: WebMcpAvailability; registered: number }> | undefined

export async function registerWebMcpTools() {
  const availability = detectWebMcpAvailability()
  if (availability !== 'WEBMCP_AVAILABLE') return { availability, registered: 0 }

  const context = document.modelContext
  if (context === registeredContext && registrationPromise) return registrationPromise

  registeredContext = context
  registrationPromise = (async () => {
    let registered = 0
    // Register guarded boundary tools too. Their handlers are intentionally
    // executable so an agent gets an explicit NOT_CONNECTED result instead of
    // silently assuming that a Shopify cart or B2B request was completed.
    for (const tool of webmcpTools) {
      await context?.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        execute: tool.execute,
      })
      registered += 1
    }
    return { availability, registered }
  })()

  return registrationPromise
}
