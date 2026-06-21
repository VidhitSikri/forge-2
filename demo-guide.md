# Kanban — Demo Guide

A 3-minute structured demo for hackathon judges. Optimized for clarity and impact: show the hero features, prove the technical depth, leave room for Q&A.

---

## Hero Features (60-second pitch)

If you only have 60 seconds, lead with these:

1. **Full CRUD on Boards, Columns, and Cards** — create, edit, delete with inline forms.
2. **Drag-and-drop that actually persists** — drop a card into another column, refresh the browser, the card is still there.
3. **Overdue detection** — cards past their `due_date` get a red border and "⚠ Overdue" badge. No third-party date library; just `new Date(due_date) < Date.now()`.
4. **Robust reordering** — same-column drag triggers a `POST /reorder` that densifies positions to 1..N with no gaps. Tested end-to-end.
5. **Server-validated inputs** — try to create a board without a name and you'll see a Laravel Form Request 422 response mapped to a banner at the top of the page.

---

## 3-Minute Walkthrough

### 0:00 – 0:30 — Architecture at a glance

**Show**: `architecture-diagram.mmd` rendered, or just talk through it.

> "We built a two-process system: a Laravel 12 API on PHP 8.2 with SQLite for persistence, and a React 18 + Vite SPA on the frontend. The Vite dev server proxies `/api` requests to Laravel, so during development there's no CORS to worry about. In production the frontend is a static bundle served by any HTTP host, and it calls the API directly."

**Quick architecture diagram (verbal):**

```
Browser (React, Vite)  ── /api/* ──▶  Laravel API (PHP 8.2)  ──▶  SQLite
                                       │
                                       └─▶  CardService (move + reorder)
```

### 0:30 – 1:15 — Create a board and see it instantly

**Show**: Empty board list.

> "Starting from an empty state. I'll create a board called 'Sprint 14'."

**Click**: "+ New board" → fill name → Create.

> "It appears in the list immediately. The frontend dispatches an action to our React Context store, which updates state and re-renders. The Vite proxy forwarded the POST to Laravel, which inserted the row and returned 201 with the new board."

**Show the network tab briefly** if visible — `POST /api/boards` → 201.

### 1:15 – 1:45 — Add columns, then cards with due dates

**Click into the board**, then add three columns: Backlog, In Progress, Done.

**Click into Backlog**, add three cards:
- "Fix flaky test" with due date **2020-01-01** (deliberately in the past — will go red).
- "Ship landing page" with due date **2027-06-30** (future).
- "Update docs" with no due date.

> "Notice this card has a red border and '⚠ Overdue · ...' label — that's the past due_date triggering our overdue styling. The on-time card shows the date normally, and the no-date card shows nothing."

### 1:45 – 2:30 — Drag and drop (the hero moment)

**Drag** the "Ship landing page" card from Backlog to In Progress.

> "I'm dragging the card across columns. Notice the column lights up blue when I hover over it with the card. When I drop, the frontend computes the target position based on where my cursor was, then calls the backend's move endpoint. Laravel's CardService densifies the source column, makes room in the target, and updates the card — all in a single database transaction."

**Now drag** a card within a column to reorder it.

> "Same idea but it triggers the reorder endpoint instead. The backend validates that I'm sending exactly the column's card ids, then applies the new order with a temporary offset to avoid swap collisions."

**Refresh the browser.**

> "And the state persists — that's a round-trip to SQLite via Laravel, not just in-memory React state."

### 2:30 – 2:50 — Validation + error handling

**Try** to create a board with no name.

> "If I submit an empty form, Laravel's Form Request validation rejects it with a 422 and a structured error response. Our HTTP client unwraps the field errors and shows them in a banner at the top of the page. Auto-dismisses after 5 seconds, but I can dismiss it manually."

**Show** the error banner briefly.

### 2:50 – 3:00 — Quality wrap-up

> "29 PHPUnit feature tests, 24-assertion end-to-end test, and a production build that ships at 65 KB of JavaScript gzipped. The full architecture is in `README.md`, the build sequence and key decisions are in `agent-log.md`, and the Mermaid diagram is at `architecture-diagram.mmd`. Happy to take questions."

---

## Q&A Cheat Sheet

**Q: Why SQLite?**
A: Zero-config persistence for a hackathon. Migrating to Postgres/MySQL later is a `.env` change.

**Q: Why no DnD library?**
A: HTML5 DnD works perfectly on desktop. We abstracted it into a `useDragDrop` hook so swapping in `@dnd-kit` later for mobile support is a one-file change.

**Q: How does the move endpoint stay consistent?**
A: `CardService::move` wraps densify-source + make-room-in-target + save-card in `DB::transaction`. If any step fails, positions roll back to their pre-move state.

**Q: What happens if two users drag at the same time?**
A: Last-write-wins. We didn't implement real-time sync (would need Laravel Echo + WebSockets). Out of scope for this iteration but a clear next step.

**Q: How do you handle authentication?**
A: We don't yet — the API is open. Adding Sanctum would be ~50 lines of config and middleware wiring. The User model is already in place.

**Q: Why not TypeScript?**
A: Time-vs-benefit. Plain JSX with clear naming + backend validation gives most of the safety win for less setup. The code is structured to be incrementally typed later.

**Q: Where's the test coverage?**
A: Backend: 29 PHPUnit feature tests covering all CRUD verbs, move, reorder, cascade deletes, validation. Frontend: a 24-assertion Node E2E that drives the same HTTP calls through the Vite proxy. Production build smoke-tested by `npm run build`.

---

## Demo Runbook (for the operator)

If you're driving the demo yourself, here's the exact sequence:

1. **Pre-demo**: Start Laravel (`cd backend && php artisan serve --host=127.0.0.1 --port=8000`) and Vite (`cd frontend && npm run dev -- --host 127.0.0.1`).
2. **Open** `http://127.0.0.1:5173/` in a fresh browser tab.
3. **Demo as scripted above**. Don't pre-create data — the empty-state → populated-state transition is more compelling.
4. **Backup plan** if the dev server crashes: `cd frontend && npm run build && cd backend && php artisan serve`. The frontend will fall back to its production-mode behavior (proxied via Vite).

---

## Scoring Against Common Judging Criteria

| Criterion | Where to find evidence |
|-----------|------------------------|
| **Technical depth** | `CardService` move + reorder with transactions; composite indexes; Form Requests; PHPUnit feature tests. |
| **Completeness** | Full CRUD across all three resources, DnD, overdue styling, validation feedback, persistence after refresh. |
| **UX polish** | Skeleton loaders, empty states, error banner, overdue highlight, drop-zone highlighting, modal escape-to-close. |
| **Code quality** | Thin controllers, dedicated service layer, factories for tests, resource transformers for JSON consistency. |
| **Documentation** | README (16 KB) with API reference, agent-log (12 KB) with decisions and blockers, Mermaid architecture diagram, this demo guide. |
| **Reproducibility** | `composer install && php artisan migrate && npm install && npm run dev` from a fresh checkout. |
