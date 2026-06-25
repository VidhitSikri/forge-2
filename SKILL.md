# SKILL.md — Kanban Card Features (Tags & Members)

> **Skill owner:** openclaw-worker  
> **Orchestrated by:** hermes  
> **Workspace:** forge-2 (Kanban board app — Laravel backend + React/Vite frontend)

---

## What this skill does

Adds **tags** and **member assignment** to Kanban cards. Both features are persisted to the database (JSON columns on the `cards` table) and are fully round-tripped through the REST API.

---

## Feature: Tags

Tags are free-form labels selected from a preset palette. Each tag carries its own accent color.

### Presets (defined in `CardFormModal.jsx`)

| Label    | Color     |
|----------|-----------|
| Bug      | `#f43f5e` |
| Feature  | `#7c3aed` |
| Urgent   | `#f59e0b` |
| Design   | `#06b6d4` |
| Backend  | `#10b981` |
| Frontend | `#ec4899` |
| Research | `#a78bfa` |
| Blocked  | `#ef4444` |
| Review   | `#3b82f6` |
| Testing  | `#84cc16` |

### How tags work

- **Stored as:** `JSON array of strings` on `cards.tags`, e.g. `["Bug", "Urgent"]`
- **UI — form:** Tag picker shows all presets as toggle chips. Active chips are highlighted with a colored glow.
- **UI — card face:** Selected tags render as compact read-only `tag-chip--display` pills with tinted backgrounds.
- **CSS class:** `.tag-chip` (base), `.tag-chip--pick` (form toggle), `.tag-chip--display` (card view), `.tag-chip--active` (selected state)
- **CSS variable:** `--tag-color` set inline per chip

---

## Feature: Member Assignment

Members are people assigned to a card. Since this app has no authentication system, members are entered as free-text names and stored with auto-generated avatar metadata.

### Member object shape

```json
{
  "name": "Alice Johnson",
  "initials": "AJ",
  "color": "#7c3aed"
}
```

- `name` — Full name entered by the user
- `initials` — First letter of first two words (auto-computed)
- `color` — Deterministic color derived from `name` via a simple hash over a 10-color palette

### How members work

- **Stored as:** `JSON array of objects` on `cards.members`
- **UI — form:** Type a name → press Enter or click "Add". A chip row shows all assigned members. Each chip has a colored avatar circle and a `×` remove button.
- **UI — card face:** Shows a row of small avatar circles (`.member-avatar--sm`) with full name in tooltip.
- **Duplicate guard:** Adding the same name (case-insensitive) is silently ignored.
- **CSS classes:** `.member-avatar`, `.member-avatar--sm`, `.member-tag`, `.member-list`, `.member-input-row`, `.member-remove`

---

## Files changed by this skill

### Backend (Laravel)

| File | Change |
|------|--------|
| `database/migrations/2026_06_25_000001_add_tags_and_members_to_cards.php` | NEW — adds `tags` (JSON, nullable) and `members` (JSON, nullable) columns |
| `app/Models/Card.php` | Added `tags`, `members` to `$fillable`; added `'array'` casts for both |
| `app/Http/Resources/CardResource.php` | Returns `tags` (default `[]`) and `members` (default `[]`) in API response |
| `app/Http/Requests/StoreCardRequest.php` | Added validation rules for `tags`, `tags.*`, `members`, `members.*.name` |
| `app/Http/Requests/UpdateCardRequest.php` | Same rules with `sometimes` prefix for partial updates |

### Frontend (React/Vite)

| File | Change |
|------|--------|
| `src/components/CardFormModal.jsx` | Full rewrite — added `TAG_PRESETS` export, tag toggle picker, member add/remove UI |
| `src/components/Card.jsx` | Updated to display `.card__tags` and `.card__members` rows |
| `src/App.css` | Added CSS sections: `CARD TAGS`, `CARD MEMBERS` (~150 lines of new styles) |

> **No changes needed** to `KanbanContext.jsx`, `api/cards.js`, or `routes/api.php` — they already pass arbitrary payload objects through unchanged.

---

## How to extend this skill

### Add a new tag preset
Edit `TAG_PRESETS` in `src/components/CardFormModal.jsx`:
```js
{ label: 'DevOps', color: '#0ea5e9' },
```

### Add real user auth to members
Replace the free-text input with a user selector. Change the member object to include `user_id`. Add a pivot table migration `card_user` and add `members(): BelongsToMany` to `Card.php`.

### Limit tag choices per board
Store allowed tags on the `boards` table as JSON and filter `TAG_PRESETS` by what the board allows before rendering the picker.

---

## Known constraints

- Tags are not indexed; filtering by tag requires a full table scan. For large datasets, add a separate `tags` / `taggables` polymorphic table.
- Members are stored denormalized (no FK). Name changes are not retroactive.
- `color-mix()` CSS requires a modern browser (Chrome 111+, Firefox 113+, Safari 16.2+).
