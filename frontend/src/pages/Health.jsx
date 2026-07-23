import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import { SERVICES, normalizeStatus, serviceValue } from '../utils/data'

export default function Health({ health }) {
  const checked = health.lastChecked?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) || 'Not checked yet'
  return <div className="page-stack">
    <div className="page-intro"><div><span className="eyebrow">SYSTEM STATUS</span><h2>Service Health</h2><p>Availability is requested securely through the Backend API. Internal infrastructure details remain private.</p></div><button className="button primary" onClick={health.refresh} disabled={health.loading}><Icon name="refresh" size={18}/>{health.loading ? 'Refreshing&' : 'Refresh status'}</button></div>
    {health.error && <div className="notice error" role="alert"><strong>Backend API unavailable</strong><span>{health.error}</span></div>}
    <div className="health-grid" aria-live="polite">{SERVICES.map((service) => { const status = normalizeStatus(serviceValue(health.data, service.key), health.loading); return <article className={`health-card accent-${service.accent}`} key={service.key}><div className="health-card-top"><div className="service-icon"><Icon name={service.key === 'vllm' ? 'chat' : service.key === 'whisper' ? 'mic' : 'scan'} size={23}/></div><StatusBadge status={status}/></div><small>{service.name}</small><h3>{service.title}</h3><p>{service.purpose}</p>{status.error && <div className="service-error">{status.error}</div>}<footer><span>Last checked</span><strong>{checked}</strong></footer></article> })}</div>
    <div className="info-card"><Icon name="health" size={24}/><div><h3>How status checks work</h3><p>The portal asks only the Backend API for service health. It never connects directly to the AI model, speech, or OCR workloads.</p></div></div>
  </div>
}
