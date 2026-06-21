export default function TextField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  error,
  rows,
  autoFocus,
}) {
  const id = `field-${name}`
  const isTextarea = type === 'textarea'
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      {label ? (
        <label htmlFor={id} className="field__label">
          {label}
          {required ? <span className="field__required" aria-hidden> *</span> : null}
        </label>
      ) : null}
      {isTextarea ? (
        <textarea
          id={id}
          name={name}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 3}
          required={required}
          autoFocus={autoFocus}
          className="field__input field__input--textarea"
        />
      ) : (
        <input
          id={id}
          name={name}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          className="field__input"
        />
      )}
      {error ? <div className="field__error">{error}</div> : null}
    </div>
  )
}
