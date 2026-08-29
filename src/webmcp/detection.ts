import { webmcpTools } from './registry'

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string
        description: string
        inputSchema: Record<string, unknown>
        outputSchema: Record<string, unknown>
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

export async function registerWebMcpTools() {
  const availability = detectWebMcpAvailability()
  if (availability !== 'WEBMCP_AVAILABLE') return { availability, registered: 0 }

  let registered = 0
  for (const tool of webmcpTools.filter((item) => item.connectionStatus !== 'NOT_CONNECTED')) {
    await document.modelContext?.registerTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
    })
    registered += 1
  }

  return { availability, registered }
}
