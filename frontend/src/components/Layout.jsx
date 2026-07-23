import Icon from './Icon'

const NAV = [
  ['dashboard', 'Dashboard', 'dashboard'], ['chat', 'Chat', 'chat'], ['speech', 'Speech to Text', 'mic'],
  ['ocr', 'OCR', 'scan'], ['health', 'Service Health', 'health'],
]

export default function Layout({ page, setPage, backendOnline, children }) {
  const current = NAV.find(([id]) => id === page)
  const descriptions = {
    dashboard: 'Your secure, self-hosted AI workspace',
    chat: 'Have a private conversation with your AI model',
    speech: 'Turn audio into accurate, searchable text',
    ocr: 'Extract readable text from your images',
    health: 'Live availability reported by the Backend API',
  }
  function navigate(id) { setPage(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  return <div className="shell">
    <input className="nav-toggle" id="nav-toggle" type="checkbox" aria-label="Toggle navigation" />
    <aside className="sidebar">
      <div className="brand"><div className="brand-logo"><Icon name="star"/></div><div><strong>Sovereign AI Assistant</strong><small>Secure Self-Hosted AI Platform</small></div></div>
      <nav aria-label="Main navigation">{NAV.map(([id, label, icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><Icon name={icon}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer"><div className="platform-state"><span className={`status-dot ${backendOnline ? 'online' : ''}`}/><span>Sovereign AI Platform</span></div><small>Version 1.0.0</small></div>
    </aside>
    <label className="nav-backdrop" htmlFor="nav-toggle" aria-hidden="true"/>
    <div className="main-column">
      <header className="topbar"><label className="menu-button" htmlFor="nav-toggle"><Icon name="menu"/><span className="sr-only">Open navigation</span></label><div><h1>{current?.[1]}</h1><p>{descriptions[page]}</p></div><span className={`connection ${backendOnline ? 'connected' : ''}`}><span className="status-dot"/>{backendOnline ? 'Backend connected' : 'Backend unavailable'}</span></header>
      <main className="content">{children}</main>
    </div>
  </div>
}
