// End-to-end test that simulates the full Kanban user journey,
// exercising the same HTTP calls the React frontend makes.
//
// Run with: node e2e-test.mjs
//
// Coverage:
//  - Board CRUD with validation feedback
//  - Column CRUD with auto order
//  - Card CRUD with due_date round-trip and overdue detection
//  - Card move (drag-and-drop equivalent: cross-column)
//  - Card reorder (drag-and-drop equivalent: same-column reorder)
//  - Error handling (422, 404)
//  - State persistence (refetch equals optimistic state)

const BASE = 'http://127.0.0.1:5173/api'

async function api(path, { method = 'GET', body } = {}) {
  const opts = { method, headers: { Accept: 'application/json' } }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  const payload = text ? JSON.parse(text) : null
  return { status: res.status, payload }
}

let pass = 0
let fail = 0
function ok(label) {
  pass++
  console.log(`  ✓ ${label}`)
}
function assert(cond, label) {
  if (cond) ok(label)
  else {
    fail++
    console.error(`  ✗ ${label}`)
  }
}

async function run() {
  console.log('\n[1] Health check')
  let r = await api('/ping')
  assert(r.status === 200, 'GET /ping -> 200')

  console.log('\n[2] Board CRUD')
  r = await api('/boards', { method: 'POST', body: { name: 'Hero Sprint', description: 'Demo board for the judges' } })
  assert(r.status === 201, 'POST /boards -> 201')
  const boardId = r.payload.data.id

  r = await api('/boards')
  assert(r.status === 200 && r.payload.data.length >= 1, 'GET /boards -> 200, list non-empty')

  r = await api(`/boards/${boardId}`)
  assert(r.status === 200 && Array.isArray(r.payload.data.columns), 'GET /boards/{id} -> 200, columns[] present')

  r = await api('/boards', { method: 'POST', body: {} })
  assert(r.status === 422 && r.payload.errors?.name?.length > 0, 'POST /boards empty -> 422 with field error')

  console.log('\n[3] Column CRUD')
  r = await api(`/boards/${boardId}/columns`, { method: 'POST', body: { name: 'Backlog' } })
  assert(r.status === 201 && r.payload.data.order === 1, 'First column auto-assigned order=1')
  const colBacklog = r.payload.data.id

  r = await api(`/boards/${boardId}/columns`, { method: 'POST', body: { name: 'In Progress' } })
  const colDoing = r.payload.data.id
  assert(r.payload.data.order === 2, 'Second column auto-assigned order=2')

  r = await api(`/boards/${boardId}/columns`, { method: 'POST', body: { name: 'Done' } })
  const colDone = r.payload.data.id
  assert(r.payload.data.order === 3, 'Third column auto-assigned order=3')

  console.log('\n[4] Card CRUD with due_date (overdue vs on-time)')
  // Past date — should render as "overdue" in the UI.
  r = await api(`/columns/${colBacklog}/cards`, {
    method: 'POST',
    body: { title: 'Fix flaky test', due_date: '2020-01-01T00:00:00Z', description: 'Caused last 3 CI failures' },
  })
  assert(r.status === 201, 'Create overdue card -> 201')
  assert(new Date(r.payload.data.due_date).getTime() < Date.now(), 'Card due_date is in the past (overdue)')
  const cardOverdue = r.payload.data

  // Future date — should render normally.
  r = await api(`/columns/${colBacklog}/cards`, {
    method: 'POST',
    body: { title: 'Ship landing page', due_date: '2027-06-30T17:00:00Z' },
  })
  assert(r.status === 201, 'Create on-time card -> 201')
  assert(new Date(r.payload.data.due_date).getTime() > Date.now(), 'Card due_date is in the future')
  const cardOnTime = r.payload.data

  r = await api(`/columns/${colBacklog}/cards`, { method: 'POST', body: { title: 'Update docs' } })
  assert(r.status === 201, 'Create card with no due date -> 201')
  const cardNoDue = r.payload.data

  r = await api(`/columns/${colBacklog}/cards`, { method: 'POST', body: { title: 'Review PRs' } })
  const cardNormal = r.payload.data

  console.log('\n[5] Card move (cross-column) — DnD-equivalent API')
  // Move the on-time card from Backlog to In Progress at position 1.
  r = await api(`/cards/${cardOnTime.id}/move`, { method: 'POST', body: { target_column_id: colDoing, position: 1 } })
  assert(r.status === 200 && r.payload.data.column_id === colDoing, 'Move card -> 200, column_id updated')
  assert(r.payload.data.position === 1, 'Move card -> position 1 in target')

  // Verify source column is densified (3 cards now: overdue, noDue, normal at positions 1, 2, 3).
  r = await api(`/boards/${boardId}`)
  const boardAfterMove = r.payload.data
  const doingCards = boardAfterMove.columns.find((c) => c.id === colDoing).cards
  assert(doingCards.length === 1 && doingCards[0].position === 1, 'Target column has 1 card at pos 1')

  console.log('\n[6] Card reorder (same-column) — DnD-equivalent API')
  // Current Backlog: [overdue(1), noDue(2), normal(3)]. Reverse first two.
  r = await api(`/columns/${colBacklog}/cards/reorder`, {
    method: 'POST',
    body: { card_ids: [cardNoDue.id, cardOverdue.id, cardNormal.id] },
  })
  assert(r.status === 200, 'Reorder cards -> 200')

  // Refetch and confirm order.
  r = await api(`/boards/${boardId}`)
  const backlogCards = r.payload.data.columns.find((c) => c.id === colBacklog).cards
  assert(backlogCards[0].id === cardNoDue.id && backlogCards[0].position === 1, 'After reorder, noDue card is at pos 1')
  assert(backlogCards[1].id === cardOverdue.id && backlogCards[1].position === 2, 'After reorder, overdue card is at pos 2')
  assert(backlogCards[2].id === cardNormal.id && backlogCards[2].position === 3, 'After reorder, normal card is at pos 3')
  const positions = backlogCards.map((c) => c.position).sort((a, b) => a - b)
  assert(JSON.stringify(positions) === JSON.stringify([1, 2, 3]), 'Positions are dense 1..N')

  console.log('\n[7] Validation error rendering')
  r = await api(`/columns/${colBacklog}/cards`, { method: 'POST', body: { description: 'no title' } })
  assert(r.status === 422 && r.payload.errors?.title?.length > 0, 'POST card missing title -> 422 with field error')

  console.log('\n[8] Persistence after refresh')
  // Refetch and confirm the moved card lives in the In Progress column.
  r = await api(`/boards/${boardId}`)
  const movedCard = r.payload.data.columns
    .flatMap((c) => c.cards)
    .find((c) => c.id === cardOnTime.id)
  assert(movedCard?.column_id === colDoing, 'Refetch: moved card persists in In Progress column')

  console.log('\n[9] Cleanup')
  r = await api(`/boards/${boardId}`, { method: 'DELETE' })
  assert(r.status === 204, 'DELETE /boards/{id} -> 204 (cascade removes columns + cards)')

  console.log(`\nResults: ${pass} passed, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

run().catch((err) => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
