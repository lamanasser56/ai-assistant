const developmentDefault = 'http://localhost:8080'
const configuredUrl = import.meta.env.VITE_API_BASE_URL
export const API_BASE_URL = (configuredUrl === undefined ? developmentDefault : configuredUrl).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'unexpected', details = '' } = {}) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.details = details
  }
}

function safeDetail(payload) {
  const detail = payload?.detail ?? payload?.message ?? payload?.error
  if (typeof detail === 'string' && detail.length < 300 && !detail.includes('<')) return detail
  if (Array.isArray(detail)) return detail.map((item) => item?.msg).filter(Boolean).join(', ')
  return ''
}

function messageFor(status, payload) {
  const detail = safeDetail(payload)
  if (status === 400 || status === 422) return [detail || 'Some information is invalid. Please review it and try again.', 'validation']
  if (status === 502 || status === 503) return ['The AI model service is temporarily unavailable. Please try again later.', 'upstream']
  if (status === 504) return ['The AI model service took too long to respond. Please try again later.', 'timeout']
  if (status >= 500) return ['The platform encountered an unexpected error. Please try again.', 'server']
  if (status === 404) return ['The requested platform endpoint is unavailable.', 'not_found']
  return [detail || `The request could not be completed (${status}).`, 'unexpected']
}

export async function apiRequest(path, { timeout = 120000, signal, ...options } = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort('timeout'), timeout)
  const abort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abort, { once: true })
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal })
    const type = response.headers.get('content-type') || ''
    const payload = type.includes('application/json') ? await response.json().catch(() => null) : null
    if (!response.ok) {
      const [message, code] = messageFor(response.status, payload)
      throw new ApiError(message, { status: response.status, code, details: safeDetail(payload) })
    }
    return payload ?? {}
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (controller.signal.aborted) throw new ApiError('The request was cancelled or timed out. Please try again.', { code: 'timeout' })
    throw new ApiError('The Backend API is unavailable. Check your connection and try again.', { code: 'backend_unavailable' })
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

export const platformApi = {
  health: (options) => apiRequest('/api/v1/services/health', { timeout: 15000, ...options }),
  chat: (body, options) => apiRequest('/api/v1/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...options }),
  transcribe: (file, options) => { const body = new FormData(); body.append('file', file); return apiRequest('/api/v1/transcribe', { method: 'POST', body, timeout: 300000, ...options }) },
  ocr: (file, options) => { const body = new FormData(); body.append('file', file); return apiRequest('/api/v1/ocr', { method: 'POST', body, timeout: 300000, ...options }) },
}
