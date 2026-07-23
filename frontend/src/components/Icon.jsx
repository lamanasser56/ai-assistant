export default function Icon({ name, size = 20 }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10M8 9h8M9 15h6"/></>,
    health: <><path d="M3 12h4l2-5 4 10 2-5h6"/><path d="M20 6.5A5 5 0 0 0 12 4a5 5 0 0 0-8 6.2C4 15 12 20 12 20s2.5-1.6 4.7-3.7"/></>,
    refresh: <><path d="M20 6v5h-5M4 18v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2.6L20 9M4 15l2.4 2.6A7 7 0 0 0 18 15"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M20 15v5H4v-5"/></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M4 12a8 8 0 0 1 .3-2l-2-1.5 2-3.4 2.3 1A8 8 0 0 1 10 4V2h4v2a8 8 0 0 1 3.4 2.1l2.3-1 2 3.4-2 1.5a8 8 0 0 1 0 4l2 1.5-2 3.4-2.3-1A8 8 0 0 1 14 20v2h-4v-2a8 8 0 0 1-3.4-2.1l-2.3 1-2-3.4 2-1.5a8 8 0 0 1-.3-2z"/></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>, close: <path d="m6 6 12 12M18 6 6 18"/>, arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
    star: <><path d="m12 3 1.45 4.55L18 9l-4.55 1.45L12 15l-1.45-4.55L6 9l4.55-1.45z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/></>,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
