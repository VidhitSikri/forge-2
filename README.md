# Kanban — Laravel + React

A full-stack Kanban board application. The backend is a Laravel 12 REST API on PHP 8.2 + SQLite; the frontend is a React 18 + Vite SPA. Boards contain columns, columns contain cards. Cards support due dates, drag-and-drop reordering, and overdue highlighting.

```
backend/   Laravel 12 API (PHP 8.2, SQLite, PHPUnit feature tests)
frontend/  React 18 SPA (Vite, JSX, plain CSS, HTML5 drag-and-drop)
```

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [API Reference](#api-reference)
5. [Frontend Guide](#frontend-guide)
6. [Backend Guide](#backend-guide)
7. [Testing](#testing)
8. [Deployment Notes](#deployment-notes)
9. [Known Constraints](#known-constraints)

---

## Quick Start

> Tested on Windows 11 with PHP 8.2.29, Node 24, npm 11. The backend and frontend run as two separate processes; both must be running for the app to work end-to-end.

### Prerequisites

| Tool | Version | Used for |
|------|---------|----------|
| PHP  | 8.2+    | Laravel runtime + extensions: pdo_sqlite, sqlite3, mbstring, openssl, tokenizer, xml, ctype, json, bcmath, fileinfo, curl, zip, intl |
| Composer | 2.x | PHP dependency manager |
| Node.js | 18+ (tested with 24) | Frontend toolchain |
| npm | 9+ | Frontend dependency manager |

### 1. Backend

```powershell
cd backend
composer install            # if vendor/ is missing
copy .env.example .env      # only if .env doesn't already exist
php artisan key:generate    # only if APP_KEY is unset
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

The API will be available at `http://127.0.0.1:8000/api`. Try `http://127.0.0.1:8000/api/ping` for a health check.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`. The Vite dev server proxies `/api/*` requests to the Laravel backend on port 8000.

### 3. Production build

```powershell
cd frontend
npm run build              # outputs frontend/dist/
```

The contents of `frontend/dist/` are static assets ready to be served from any HTTP server.

---

## Architecture Overview

```
┌─────────────────────┐         /api/*          ┌──────────────────────┐
│   Browser (React)   │  ─────────────────────► │  Laravel API (PHP)   │
│   Vite dev :5173    │                          │  :8000               │
│   HTML5 DnD         │                          │  SQLite (file)       │
└─────────────────────┘                          └──────────────────────┘
```

- **Frontend → API**: All requests go through `/api/*`. Vite proxies to `http://127.0.0.1:8000` during development; in production the frontend bundle is served by any static host and calls the API directly.
- **Backend persistence**: SQLite file at `backend/database/database.sqlite`. Schema is fully migrated by `php artisan migrate`.
- **State management**: React Context + `useReducer` (no Redux/Zustand). API responses are dispatched into the reducer and the UI re-renders.
- **Drag-and-drop**: Native HTML5 DnD (`draggable`, `onDragStart`, `onDragOver`, `onDrop`). No DnD library.
- **Service layer for move/reorder**: Encapsulated in `backend/app/Services/CardService.php` — handles densification (renumber positions to 1..N with no gaps) and target-position shifting inside a single DB transaction.

For a Mermaid-format diagram, see [`architecture-diagram.mmd`](./architecture-diagram.mmd).

---

## Project Structure

```
.
├── backend/                       Laravel 12 REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/       BoardController, ColumnController, CardController
│   │   │   ├── Requests/          Form Request validation classes (8)
│   │   │   └── Resources/         JSON Resource transformers (3)
│   │   ├── Models/                Board, Column, Card (Eloquent)
│   │   └── Services/
│   │       └── CardService.php    Business logic for move + reorder
│   ├── database/
│   │   ├── database.sqlite        SQLite file (development)
│   │   ├── factories/             BoardFactory, ColumnFactory, CardFactory
│   │   └── migrations/            Schema migrations (incl. boards, columns, cards)
│   ├── routes/
│   │   └── api.php                API route definitions
│   └── tests/Feature/             PHPUnit feature tests (29 tests)
├── frontend/                      React 18 + Vite SPA
│   ├── src/
│   │   ├── api/                   API client + resource modules
│   │   ├── components/            UI components (Button, Modal, Card, Column, ...)
│   │   ├── hooks/
│   │   │   └── useDragDrop.js     HTML5 drag-and-drop wiring
│   │   ├── store/
│   │   │   └── KanbanContext.jsx  Global state via React Context + useReducer
│   │   ├── App.jsx, main.jsx, index.css, App.css
│   ├── vite.config.js             Vite config (dev proxy)
│   └── e2e-test.mjs               Node-based end-to-end test
├── architecture-diagram.mmd       Mermaid architecture diagram
├── agent-log.md                   Project evolution (T0 → T6)
├── demo-guide.md                  3-minute demo script
└── README.md                      This file
```

---

## API Reference

All endpoints are prefixed with `/api`. All responses use JSON. Resource payloads are wrapped as `{ "data": ... }`.

### Boards

| Method | Path                  | Body                       | Status | Description |
|--------|-----------------------|----------------------------|--------|-------------|
| GET    | `/api/boards`         |                            | 200    | List boards (lightweight: no columns/cards). |
| POST   | `/api/boards`         | `{ name, description? }`   | 201    | Create board. `name` required. |
| GET    | `/api/boards/{id}`    |                            | 200    | Fetch one board with nested `columns[]` and `cards[]`. |
| PATCH  | `/api/boards/{id}`    | partial                    | 200    | Update board fields. |
| DELETE | `/api/boards/{id}`    |                            | 204    | Delete board. Cascades to columns → cards. |

### Columns (nested)

| Method | Path                                       | Body            | Status | Description |
|--------|--------------------------------------------|-----------------|--------|-------------|
| GET    | `/api/boards/{board}/columns`              |                 | 200    | List columns for a board (ordered by `order`). |
| POST   | `/api/boards/{board}/columns`              | `{ name, order? }` | 201 | Create column. `order` auto-assigned if omitted. |
| GET    | `/api/columns/{column}`                    |                 | 200    | Fetch one column with cards. |
| PATCH  | `/api/columns/{column}`                    | partial         | 200    | Update column. |
| DELETE | `/api/columns/{column}`                    |                 | 204    | Delete column. Cascades to cards. |

### Cards

| Method | Path                                          | Body                                            | Status | Description |
|--------|-----------------------------------------------|-------------------------------------------------|--------|-------------|
| GET    | `/api/columns/{column}/cards`                 |                                                 | 200    | List cards for a column (ordered by `position`). |
| POST   | `/api/columns/{column}/cards`                 | `{ title, description?, due_date?, position? }` | 201    | Create card. `title` required. `position` auto-assigned if omitted. |
| GET    | `/api/cards/{card}`                           |                                                 | 200    | Fetch one card. |
| PATCH  | `/api/cards/{card}`                           | partial                                         | 200    | Update card. |
| DELETE | `/api/cards/{card}`                           |                                                 | 204    | Delete card. |
| POST   | `/api/cards/{card}/move`                      | `{ target_column_id, position? }`               | 200    | Move a card to another column (or same column) at an optional position. |
| POST   | `/api/columns/{column}/cards/reorder`         | `{ card_ids: [int, ...] }`                      | 200    | Reorder cards within a column. The `card_ids` array must contain exactly the ids of every card in the column. |

### Misc

| Method | Path        | Description |
|--------|-------------|-------------|
| GET    | `/api/ping` | `{ "pong": true }` health check. |

### Validation & Error Responses

Laravel Form Request classes enforce input validation. Errors return:

```json
HTTP 422
{
  "message": "The name field is required.",
  "errors": { "name": ["The name field is required."] }
}
```

| Code | Meaning |
|------|---------|
| 200  | OK (read/update/successful move) |
| 201  | Created |
| 204  | No Content (delete) |
| 400  | Bad Request (e.g., reorder ids do not match the column's cards) |
| 404  | Not Found (route-model binding fails) |
| 422  | Unprocessable Entity (validation failure) |

---

## Frontend Guide

### Components

| Component | Purpose |
|-----------|---------|
| `App` | Top-level shell; routes between `BoardList` and `BoardView`. |
| `BoardList` | List of boards (grid) with create / edit / delete. |
| `BoardView` | Single board: columns laid out horizontally with vertical card stacks. |
| `Column` | A column with cards. Acts as drop target for HTML5 DnD. |
| `Card` | A single card. Displays title, description, due date, overdue highlight. Acts as drag source. |
| `BoardFormModal`, `CardFormModal` | Forms for create/edit. |
| `ConfirmDialog` | Reusable confirmation modal (used for destructive actions). |
| `Modal` | Generic modal with backdrop, escape-to-close, focus management. |
| `Button`, `TextField`, `Spinner`, `EmptyState`, `ErrorBanner`, `Skeleton` | UI primitives. |
| `useDragDrop` (hook) | HTML5 DnD wiring shared by Column and Card. |

### State

`KanbanProvider` (in `src/store/KanbanContext.jsx`) holds:

- `boards: Board[]` — lightweight board list (id, name, description).
- `selectedBoard: Board | null` — full board with `columns[]` and `cards[]`.
- `loading: { boards, board, action }` — three loading flags for the main flows.
- `error: string | null` — global error banner; auto-dismissed after 5 seconds.

### Running tests

```powershell
node e2e-test.mjs        # 24 assertions covering CRUD + move + reorder + validation
```

The script assumes the Vite dev server (port 5173) and Laravel API (port 8000) are both running.

---

## Backend Guide

### Migrations

| File | Purpose |
|------|---------|
| `0001_01_01_000000_create_users_table.php` | Default Laravel users + password_reset_tokens + sessions. |
| `0001_01_01_000001_create_cache_table.php` | Default Laravel cache. |
| `0001_01_01_000002_create_jobs_table.php`  | Default Laravel jobs. |
| `2026_06_21_081219_create_boards_table.php` | `boards (id, name, description, timestamps)`. |
| `2026_06_21_081220_create_columns_table.php` | `columns (id, board_id FK CASCADE, name, order, timestamps)`. |
| `2026_06_21_090940_create_cards_table.php` | `cards (id, column_id FK CASCADE, title, description, due_date, position, timestamps)`. |

Cascade deletes are configured at the FK level: deleting a board removes its columns, deleting a column removes its cards.

### Indexes

- `boards`: implicit PK.
- `columns`: composite `(board_id, order)` to support "list columns for a board in order" queries.
- `cards`: composite `(column_id, position)` to support "list cards for a column in position order" queries.

### Service Layer

`CardService` (in `app/Services/CardService.php`) encapsulates two non-trivial operations:

1. **`move(Card $card, Column $target, ?int $position = null): Card`**
   - Densifies the source column (renumber positions to 1..N, excluding the moving card).
   - Determines the final position in the target column (request parameter or "append").
   - Makes room in the target by incrementing positions ≥ the target position.
   - Updates the card's `column_id` and `position`.
   - All in a single DB transaction.

2. **`reorder(Column $column, array $orderedIds): Column`**
   - Validates that `$orderedIds` contains exactly the ids of every card in the column (no missing, no extra).
   - Applies the new ordering using a temporary offset to avoid swap collisions.
   - All in a single DB transaction.

### Routes

Defined in `backend/routes/api.php`. The prefix `/api` is applied by Laravel's bootstrap configuration in `backend/bootstrap/app.php`.

### Running tests

```powershell
cd backend
vendor\bin\phpunit
```

Expected: 29 tests, 93 assertions, all green in under a second.

---

## Testing

The project has three layers of testing:

1. **PHPUnit feature tests** (`backend/tests/Feature/`): 29 tests covering all API endpoints, move/reorder logic, cascade deletes, validation errors.
2. **Node-based E2E** (`frontend/e2e-test.mjs`): 24 assertions driving the actual HTTP endpoints through the Vite dev proxy. Covers the user journey end-to-end (board → columns → cards → move → reorder → persistence).
3. **Production build**: `npm run build` must succeed with no errors.

---

## Deployment Notes

For a single-host deployment, the simplest path is:

1. Build the frontend: `cd frontend && npm run build`.
2. Copy `frontend/dist/*` into a path served by Laravel's `public/` (e.g., `backend/public/build/`).
3. Add a catch-all route in `backend/routes/web.php` that serves `public/build/index.html` for non-API routes.
4. Run Laravel behind a real web server (nginx + PHP-FPM, or Apache + mod_php).
5. Configure the SQLite path in `.env` if the production filesystem layout differs.

For separate-host deployments, point the frontend's `BASE` constant (`frontend/src/api/client.js`) at the API's public URL and rebuild.

---

## Known Constraints

- **No authentication.** The API is open. Adding Laravel Sanctum or another auth layer is straightforward but out of scope.
- **No drag-and-drop library.** HTML5 DnD has known quirks on mobile browsers (touch events aren't supported natively). For mobile support, integrate `@dnd-kit/core` or `react-dnd` with a touch backend.
- **No real-time updates.** If multiple users edit the same board simultaneously, last write wins. Add Laravel Echo + WebSockets for real-time collaboration.
- **SQLite only.** The app is configured for SQLite; switching to MySQL/PostgreSQL requires updating `.env` and Laravel's database config.
- **Tags and member assignments are out of scope for this iteration.** The Card model has a docblock reserving extension points for a polymorphic `tags()` relation and a `members()` belongs-to-many.
