export function Skeleton({ variant = 'text', width, height, style = {}, className = '' }) {
  const classes = ['skeleton', `skeleton--${variant}`, className].filter(Boolean).join(' ')
  return <span className={classes} style={{ width, height, ...style }} aria-hidden />
}

export function BoardListSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-board-list" aria-busy="true" aria-live="polite">
      <div className="skeleton skeleton--title" style={{ width: 200, marginBottom: 32 }} />
      <div className="skeleton-board">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-board__card">
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 16 }} />
            <div className="skeleton skeleton--title" style={{ width: '55%' }} />
            <div className="skeleton skeleton--text" style={{ width: '85%' }} />
            <div className="skeleton skeleton--text" style={{ width: '70%' }} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 0' }} />
            <div className="skeleton skeleton--text" style={{ width: '40%', height: 8 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function BoardViewSkeleton({ columns = 3, cardsPerColumn = 3 }) {
  return (
    <div className="board-view__columns" aria-busy="true" aria-live="polite">
      {Array.from({ length: columns }).map((_, ci) => (
        <div key={ci} className="column">
          <div className="column__header">
            <div className="skeleton skeleton--title" style={{ width: '50%', height: 14 }} />
            <div className="skeleton" style={{ width: 28, height: 20, borderRadius: 999 }} />
          </div>
          <div className="column__cards">
            {Array.from({ length: cardsPerColumn }).map((__, i) => (
              <div key={i} className="card" style={{ pointerEvents: 'none', gap: 10 }}>
                <div className="skeleton skeleton--title" style={{ width: '70%', height: 14 }} />
                <div className="skeleton skeleton--text" style={{ width: '90%' }} />
                <div className="skeleton skeleton--text" style={{ width: '60%' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
