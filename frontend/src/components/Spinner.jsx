export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__ring" aria-hidden />
      <span className="spinner__label">{label}</span>
    </div>
  )
}
