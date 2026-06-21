/**
 * Lightweight HTTP client for the Laravel Kanban API.
 *
 * Conventions:
 *  - Laravel resources wrap payloads as `{ data: ... }`. We unwrap that automatically.
 *  - Errors are normalized to an `ApiError` with `status`, `message`, and (when applicable) `errors` map.
 */
const BASE = '/api'

export class ApiError extends Error {
  constructor({ status, message, errors }) {
    super(message || `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors || {}
  }
}

async function parseBody(response) {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const opts = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE}${path}`, opts)
  const payload = await parseBody(response)

  if (!response.ok) {
    // Laravel validation errors come back as:
    // { message: "...", errors: { field: ["..."] } }
    throw new ApiError({
      status: response.status,
      message: payload?.message,
      errors: payload?.errors,
    })
  }

  // Unwrap { data: ... } envelope from API resources.
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data
  }
  return payload
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
}
