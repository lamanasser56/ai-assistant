export default function StatusBadge({ status, compact = false }) {
  return <span className={`status-badge status-${status.kind} ${compact ? 'compact' : ''}`}><span className="status-dot" aria-hidden="true" />{status.label}</span>
}
