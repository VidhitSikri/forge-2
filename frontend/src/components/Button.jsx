export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...rest
}) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(' ')
  return (
    <button type={type} disabled={disabled || loading} onClick={onClick} className={classes} {...rest}>
      {loading ? <span className="btn__spinner" aria-hidden /> : null}
      <span className={loading ? 'btn__label--loading' : ''}>{children}</span>
    </button>
  )
}
