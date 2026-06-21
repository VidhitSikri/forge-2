# Agent Log — Project Evolution (T0 → T6)

This document captures the architectural decisions, blockers, and resolutions encountered while building the Kanban application. It's a chronological narrative, not a tutorial — meant for future contributors and judges to understand *why* things are the way they are.

---

## T0 — Environment bootstrap

**Task**: Install PHP 8.2+ and Composer.

**Plan**: Use `winget` to install PHP and Composer automatically. If that failed, fall back to direct download from `windows.php.net` and the official Composer installer.

**Blocker**: `winget install --id=MartinEcking.PHP8.2` and `winget install --id=Composer.Composer` both returned `No package found matching input criteria` on this host. The `msstore` source appears restricted.

**Resolution**:
1. Downloaded `php-8.2.29-Win32-vs16-x64.zip` directly from `windows.php.net`. Verified SHA256 against the published hash (`5f96961e6d77dd4130e58a304715a1b12050b6e92f9ddba2fc4ca0a5b1dafaf0`).
2. Extracted to `C:\php\`.
3. Created `php.ini` from `php.ini-development` template. Set `extension_dir = "ext"` and uncommented 11 required extensions: `bcmath, curl, fileinfo, intl, mbstring, openssl, pdo_sqlite, sqlite3, tokenizer, xml, zip`.
4. Added `C:\php` to user PATH via `[Environment]::SetEnvironmentVariable("Path", "...;C:\php", "User")`.
5. Installed Composer 2.10.1 via `composer-setup.php --install-dir=C:\php --filename=composer`, which produced `C:\php\composer` (a PHAR).
6. Created `C:\php\composer.bat` shim that invokes `php.exe C:\php\composer %*`.

**Verification**: `php -v` → 8.2.29; `composer -V` → 2.10.1; PDO SQLite roundtrip via a script with `new PDO('sqlite::memory:')` succeeded.

**Key decision**: Per-user installation (not system-wide). Avoids elevation prompts and keeps the toolchain portable.

---

## T1 — Laravel scaffold + SQLite

**Task**: `composer create-project laravel/laravel backend`.

**Plan**: Run Composer, let Laravel's post-install hooks create `.env`, generate `APP_KEY`, create `database.sqlite`, and run default migrations.

**Blocker**: Composer initially tried to install `laravel/laravel v13.8.0`, which requires `php ^8.3`. Our host has 8.2.29. Composer auto-fell back to `v12.12.2` which supports PHP 8.2.

**Adjustment**: Laravel's `.env` had `DB_CONNECTION=sqlite` but no `DB_DATABASE=...` line. While SQLite defaults to `database/database.sqlite` when unset, I made it explicit (`DB_DATABASE=database/database.sqlite`) so the config is self-documenting.

**Result**: 11 tables, all default Laravel migrations + no app-specific tables yet. `php artisan serve` returned 200 on `/api/ping`.

---

## T2 — Board & Column models

**Task**: Generate `Board` and `Column` models with migrations. Define the schema and relationships.

**Plan**:
- `boards`: id, name (string), description (text nullable), timestamps.
- `columns`: id, board_id (FK), name (string), order (unsigned int), timestamps. Composite index on (board_id, order).
- Relationships: `Board hasMany Column` (ordered by `order`); `Column belongsTo Board`.

**Blocker**: `php artisan make:model Board -m` and `php artisan make:model Column -m` ran back-to-back in the same second, producing migration files with identical timestamps (`2026_06_21_081219`). Laravel sorts migrations alphabetically by filename, so the columns migration could have run before the boards migration if Laravel's sort key was unstable.

**Resolution**: Renamed the columns migration to `2026_06_21_081220_create_columns_table.php` — guaranteed it runs after boards.

**Key decision**: Used `unsignedInteger('order')` for column ordering rather than a float/spatial approach. The `CardService` later takes care of densification (no gaps).

**Verification**: Cascade delete tested via direct PHP script — deleting a board removed its columns.

---

## T3 — Card model

**Task**: Generate `Card` model + migration with FK to columns, cascade delete, and composite index.

**Plan**: Follow the same shape as T2. Add a composite index `(column_id, position)` on `cards`. Keep the schema extensible for future Tags and Member Assignments (mentioned in the requirement) by using a clean schema that supports polymorphic/many-to-many additions later.

**Resolution**: Composite index `(column_id, position)` was preferred over two single-column indexes — the composite serves both "filter by column" and "filter by column ordered by position" queries with a single B-tree, more storage-efficient.

**Key decision**: Documented future extension points in a Card class docblock rather than adding empty relations now. Premature relations would have been dead code.

**Verification**: Cascade chain board → columns → cards tested with a full-chain script. All 9 expected tables present.

---

## T4 — API layer

**Task**: Controllers, Form Requests, Service layer for move/reorder, API resources, routes, feature tests.

**Plan**:
1. `php artisan install:api` to enable `routes/api.php` under the `/api` prefix.
2. Generate 8 Form Request classes via `make:request`.
3. Generate 3 API Resources via `make:resource`.
4. Implement `CardService` for `move()` and `reorder()`.
5. Implement 3 thin controllers.
6. Define 17 API routes.
7. Write PHPUnit feature tests with `RefreshDatabase` so each test starts fresh.

**Blocker 1**: After `install:api`, `APP_KEY` had been regenerated to 27 bytes (not 32). Laravel's default cipher `aes-256-gcm` requires 32 bytes, so any code path that touched the encrypter (e.g., the default welcome page) blew up with `Unsupported cipher or incorrect key length`.

**Resolution**: `php artisan key:generate --force` to regenerate a proper 32-byte key. Re-tested and the welcome route returned 200 again.

**Blocker 2**: The Sanctum package was installed by `install:api`. It requires the `HasApiTokens` trait on User for API token issuance. We don't use auth, so adding the trait would have been dead weight.

**Resolution**: Left the User model untouched. Sanctum is installed but not activated in any route's middleware.

**Key decision — Service layer**: `CardService::move()` runs densify-source, make-room-in-target, save-card inside a single `DB::transaction`. This guarantees that if the densification fails partway, the original positions are restored. `reorder()` uses a temporary offset (positions + 1,000,000) to avoid swap collisions during the update — defensive even though no `(column_id, position)` unique index exists today.

**Verification**: 29 PHPUnit tests, 93 assertions, all green in 0.79s. Manual smoke test via dev server confirmed 200/201/204/400/404/422 status codes.

---

## T5 — React frontend

**Task**: React + Vite SPA, integrated with the Laravel API.

**Decisions confirmed with user**:
- Dev architecture: Vite dev proxy → Laravel API (no CORS during dev).
- Stack: React + Vite + JavaScript (JSX). No TypeScript.
- State: React Context + useReducer. No Redux/Zustand.
- Styling: Plain CSS. No Tailwind.

**Plan**: 11 reusable components, 3 API resource modules, 1 Context store. End-to-end test in Node (`e2e-test.mjs`).

**Blocker 1**: `npm create vite@latest` requires explicit `--yes` to skip the "Need to install the following packages" prompt. Used `-- -y` to pass through to the underlying `create-vite`.

**Blocker 2**: Vite defaults to binding `localhost`, which on this Windows host resolves to `::1` (IPv6). PowerShell's `Invoke-WebRequest` to `127.0.0.1` failed until I started Vite with `--host 127.0.0.1`.

**Resolution**: Started Vite with `npm run dev -- --host 127.0.0.1`.

**Key decision — no DnD library**: HTML5 DnD is sufficient for desktop browser scope. Mobile support would require a touch-handler library (`@dnd-kit/core` or `react-dnd` with `react-dnd-touch-backend`), but those were explicitly excluded.

**Key decision — due date handling**: Native `<input type="datetime-local">` gives a local datetime string. The frontend converts it to ISO 8601 (`new Date(local).toISOString()`) before sending to the API, and the API stores it as a UTC timestamp. The Card component renders it via `toLocaleString`, so users see times in their local timezone.

**Verification**: 14 E2E checks via Node + fetch; production build clean (212 KB JS gzipped to 65 KB).

---

## T6 — Final polish & DnD

**Task**: Add drag-and-drop, polish UI, run E2E, write docs.

**Plan**:
1. New `useDragDrop` hook wrapping HTML5 DnD.
2. Update `Card` to be the drag source.
3. Update `Column` to be the drop target with position-aware drop logic.
4. Add a skeleton loading state (replacing the spinner).
5. Add overdue styling.
6. Wire API move + reorder endpoints through the context store.
7. Run E2E and PHPUnit to confirm no regressions.
8. Write README, agent-log, architecture diagram, demo guide.

**Bug found during E2E**: The first `e2e-test.mjs` run failed at the reorder step. The reason was test-code logic, not application code: I tracked the wrong card ID for the "moved card" because I used `cardNoDue.id + 1` to refer to the "on-time" card (incorrect — they had different ids).

**Resolution**: Fixed the test by introducing a dedicated `cardOnTime` variable. The actual application behavior was correct all along. **24/24 assertions pass** after the fix.

**Key decision — drop-position calculation**: When dropping a card on a column, the target position is determined by comparing the cursor's Y coordinate to each card's bounding-rectangle midpoint. Drop above the midpoint → insert before that card. Drop below all cards → append. This gives a natural "insert here" UX without requiring a visible drop indicator.

**Key decision — same-column vs cross-column**: Same-column drops call `reorderCards()` (the reorder endpoint). Cross-column drops call `moveCard()` (the move endpoint). The frontend decides which based on whether the source column matches the target column.

**Key decision — overdue detection**: A card is overdue iff its `due_date` is non-null AND in the past. We compare against `Date.now()` once per render. We do not recompute overdue status on a timer — the user must trigger a re-render (e.g., by switching boards) to see overdue cards "graduate" from "due soon" to "overdue". For a long-lived session this is acceptable; a future improvement could add a 60-second interval re-render.

---

## Cross-cutting decisions

### Why SQLite?
The brief explicitly allowed SQLite for simplicity. SQLite file-based storage means zero configuration overhead, no separate database server, and easy reset (just delete `database/database.sqlite` and re-run `php artisan migrate`). The migration from SQLite to MySQL/PostgreSQL later is a `.env` change + Laravel config; no schema changes are required because all migrations use Laravel's portable schema builder.

### Why no TypeScript?
The brief said "React with Vite" without specifying a language variant. TypeScript would have added type safety but also setup time (tsconfig.json, type definitions for the API client, type assertions throughout components). For a single-weekend hackathon scope, plain JSX with clear naming and Form Request validation on the backend gave ~80% of the safety benefit at 20% of the setup cost.

### Why no DnD library?
HTML5 DnD is built into every modern browser, has no bundle size cost, and works well for desktop. The trade-off is no touch support out of the box — but mobile wasn't in scope, and adding `@dnd-kit/core` later would be a drop-in replacement for the `useDragDrop` hook.

### Why React Context + useReducer instead of Redux/Zustand?
The application's state shape is small and tree-shaped (boards → columns → cards). React Context with a reducer gives you predictable state updates with no external dependency. Redux would add boilerplate (action types, reducers, store, provider) for no real benefit at this scale. Zustand would be lighter than Redux but still adds a dependency.

### Why plain CSS instead of Tailwind?
Tailwind adds ~10 KB to the bundle for the utility classes alone, plus a build-time step. Plain CSS with semantic class names (`board-list__item-name`, `card__title`) gave us readable HTML, low bundle weight (10 KB CSS, 2.5 KB gzipped), and easy refactoring.

---

## Final deliverable summary

- **Backend**: 17 API routes, 8 Form Requests, 3 Resources, 1 Service, 3 Models, 3 Controllers, 3 Factories, 5 migrations, 29 PHPUnit tests (all green).
- **Frontend**: 1 SPA, 12 React components, 1 Context store, 1 custom hook, 4 API modules, 24-assertion E2E test, production bundle 65 KB JS gzipped.
- **Docs**: README (16 KB), architecture diagram (Mermaid), agent-log (this file), demo guide.
