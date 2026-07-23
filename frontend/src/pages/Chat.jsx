import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { platformApi } from '../services/api'
import { extractText } from '../utils/data'

const EXAMPLES = ['Explain how Kubernetes schedules a pod', 'Draft a secure API checklist', 'Summarize the benefits of sovereign AI']

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [maxTokens, setMaxTokens] = useState('')
  const [temperature, setTemperature] = useState('')
  const [settings, setSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  function validate() {
    if (maxTokens && (!Number.isInteger(Number(maxTokens)) || Number(maxTokens) < 1)) return 'Max tokens must be a positive whole number.'
    if (temperature && (Number(temperature) < 0 || Number(temperature) > 2)) return 'Temperature must be between 0 and 2.'
    return ''
  }

  async function send(text = draft, retryId) {
    const content = text.trim()
    if (!content || loading) return
    const validation = validate()
    if (validation) { setSettingsError(validation); setSettings(true); return }
    setSettingsError('')
    const userMessage = retryId ? null : { id: crypto.randomUUID(), role: 'user', content }
    const requestId = crypto.randomUUID()
    setMessages((current) => [...current.filter((item) => item.id !== retryId), ...(userMessage ? [userMessage] : [])])
    setDraft(''); setLoading(true)
    const body = { message: content }
    if (maxTokens) body.max_tokens = Number(maxTokens)
    if (temperature) body.temperature = Number(temperature)
    try {
      const data = await platformApi.chat(body)
      const response = extractText(data, ['response', 'message', 'content', 'answer']) || 'The model returned an empty response.'
      setMessages((current) => [...current, { id: requestId, role: 'assistant', content: response }])
    } catch (error) {
      setMessages((current) => [...current, { id: requestId, role: 'error', content: error.message, retryText: content }])
    } finally { setLoading(false) }
  }

  return <section className="chat-card" aria-label="AI chat">
    <div className="chat-heading"><div className="assistant-avatar"><Icon name="star" size={18}/></div><div><h2>Sovereign AI</h2><span><i/>Self-hosted assistant</span></div><button className="icon-button" onClick={() => setSettings(!settings)} aria-expanded={settings} aria-label="Chat settings"><Icon name="settings"/></button></div>
    {settings && <div className="settings-panel"><div><label htmlFor="max-tokens">Max tokens <span>Optional</span></label><input id="max-tokens" type="number" min="1" step="1" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} placeholder="512"/></div><div><label htmlFor="temperature">Temperature <span>0-2, optional</span></label><input id="temperature" type="number" min="0" max="2" step=".1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="0.7"/></div>{settingsError && <p className="field-error" role="alert">{settingsError}</p>}</div>}
    <div className="conversation" aria-live="polite">
      {!messages.length && !loading && <div className="chat-empty"><div className="empty-orb"><Icon name="star" size={25}/></div><h3>How can I help today?</h3><p>Ask a question or start with one of these ideas.</p><div className="prompt-grid">{EXAMPLES.map((prompt) => <button key={prompt} onClick={() => send(prompt)}>{prompt}<Icon name="arrow" size={16}/></button>)}</div></div>}
      {messages.map((message) => <div className={`message-row ${message.role}`} key={message.id}><div className="message-avatar">{message.role === 'user' ? 'You' : <Icon name="star" size={15}/>}</div><div className="message-bubble"><p>{message.content}</p>{message.role === 'error' && <button onClick={() => send(message.retryText, message.id)}>Retry</button>}</div></div>)}
      {loading && <div className="message-row assistant"><div className="message-avatar"><Icon name="star" size={15}/></div><div className="message-bubble typing" aria-label="Assistant is responding"><span/><span/><span/></div></div>}
      <div ref={endRef}/>
    </div>
    <div className="composer-wrap"><div className="composer"><label className="sr-only" htmlFor="chat-message">Message Sovereign AI</label><textarea id="chat-message" rows="1" value={draft} disabled={loading} placeholder="Message Sovereign Ai&" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}/><button onClick={() => send()} disabled={loading || !draft.trim()} aria-label="Send message"><Icon name="send" size={19}/></button></div><small>Enter to send · Shift+Enter for a new line</small></div>
  </section>
}
