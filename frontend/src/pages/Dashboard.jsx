import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import { SERVICES, normalizeStatus, serviceValue } from '../utils/data'

const TOOLS = [
  { page: 'chat', title: 'AI Chat', text: 'Explore ideas and get thoughtful answers from your self-hosted language model.', action: 'Start Chat', icon: 'chat', accent: 'purple' },
  { page: 'speech', title: 'Speech to Text', text: 'Convert audio recordings into clear, editable transcripts securely.', action: 'Transcribe Audio', icon: 'mic', accent: 'green' },
  { page: 'ocr', title: 'OCR', text: 'Extract useful, copy-ready text from documents and images.', action: 'Extract Text', icon: 'scan', accent: 'orange' },
]

export default function Dashboard({ health, setPage }) {
  const checked = health.lastChecked?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Not checked'
  return <div className="dashboard">
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow">PRIVATE AI · YOUR INFRASTRUCTURE</span><h2>Sovereign AI Assistant Platform</h2><p>Chat with AI, transcribe audio, and extract text from images through one secure self-hosted platform.</p><button className="button primary" onClick={() => setPage('chat')}>Open AI Chat <Icon name="arrow" size={18}/></button></div>
      <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-core"><Icon name="star" size={38}/></div><span className="art-chip chip-one"><Icon name="chat"/></span><span className="art-chip chip-two"><Icon name="mic"/></span><span className="art-chip chip-three"><Icon name="scan"/></span></div>
    </section>
    <section aria-labelledby="summary-title"><div className="section-heading"><div><span className="eyebrow">LIVE AVAILABILITY</span><h2 id="summary-title">Service overview</h2></div><button className="button ghost" onClick={health.refresh} disabled={health.loading}><Icon name="refresh" size={17}/>{health.loading ? 'Checking&' : 'Refresh'}</button></div>
      {health.error && <div className="notice error" role="alert">{health.error}</div>}
      <div className="summary-grid">{SERVICES.map((service) => <article className={`summary-card accent-${service.accent}`} key={service.key}><div className="service-icon"><Icon name={service.key === 'vllm' ? 'chat' : service.key === 'whisper' ? 'mic' : 'scan'}/></div><div><small>{service.name}</small><h3>{service.title}</h3></div><StatusBadge status={normalizeStatus(serviceValue(health.data, service.key), health.loading)}/></article>)}</div>
    </section>
    <section aria-labelledby="tools-title"><div className="section-heading"><div><span className="eyebrow">AI WORKSPACE</span><h2 id="tools-title">What would you like to do?</h2></div></div>
      <div className="tool-grid">{TOOLS.map((tool) => <article className={`tool-card accent-${tool.accent}`} key={tool.page} onClick={() => setPage(tool.page)}><div className="tool-icon"><Icon name={tool.icon} size={27}/></div><h3>{tool.title}</h3><p>{tool.text}</p><button onClick={() => setPage(tool.page)}>{tool.action} <Icon name="arrow" size={17}/></button></article>)}</div>
    </section>
    <section className="dashboard-health"><div><span className="eyebrow">PLATFORM SERVICES</span><h2>Service health</h2><p>Current status reported by the Backend API.</p></div><div className="health-rows">{SERVICES.map((service) => <div key={service.key}><span>{service.name}</span><StatusBadge compact status={normalizeStatus(serviceValue(health.data, service.key), health.loading)}/></div>)}<small>Last checked: {checked}</small></div><button className="button secondary" onClick={() => setPage('health')}>View details</button></section>
  </div>
}
