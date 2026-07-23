export const SERVICES = [
  { key: 'vllm', name: 'vLLM', title: 'AI Model', purpose: 'Language understanding and generation', accent: 'purple' },
  { key: 'whisper', name: 'Whisper', title: 'Speech Recognition', purpose: 'Secure audio transcription', accent: 'green' },
  { key: 'ocr', name: 'OCR', title: 'Image Text Extraction', purpose: 'Text recognition from images', accent: 'orange' },
]
export function serviceValue(payload, key) { return payload?.services?.[key] ?? payload?.[key] }
export function normalizeStatus(value, checking = false) {
  if (checking) return { label: 'Checking', kind: 'checking', error: '' }
  const raw = typeof value === 'object' ? value?.status ?? value?.healthy ?? value?.available : value
  const normalized = String(raw ?? '').toLowerCase()
  if (raw === true || ['healthy', 'ok', 'ready', 'available', 'up', 'running'].includes(normalized)) return { label: 'Healthy', kind: 'healthy', error: '' }
  const detail = typeof value === 'object' ? value?.message ?? value?.error ?? value?.detail : ''
  const error = typeof detail === 'string' && !detail.includes('<') ? detail.slice(0, 240) : ''
  if (raw === false || ['unhealthy', 'down', 'unavailable', 'error', 'failed'].includes(normalized)) return { label: 'Unavailable', kind: 'unavailable', error }
  return { label: 'Unknown', kind: 'unknown', error }
}
export function extractText(data, fields) { if (typeof data === 'string') return data; for (const field of fields) if (typeof data?.[field] === 'string') return data[field]; return '' }
export function processingTime(data) { const value = data?.processing_time ?? data?.processing_time_seconds ?? data?.duration; if (value === undefined || value === null) return ''; return typeof value === 'number' ? `${value.toFixed(value < 10 ? 2 : 0)} seconds` : String(value) }
export function formatBytes(bytes) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB` }
