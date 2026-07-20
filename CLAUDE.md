# HQ

Personal homepage/project manager. React 18 + Vite + Tailwind + React Router v6, Supabase (Postgres + Auth + Edge Functions). Single user, no multi-tenancy.

## Design system — read before touching any UI

This app follows a strict minimal, monochrome aesthetic carried over from the original Canada PR tracker prototype it was migrated from. Treat deviations as bugs, not style choices.

**Never use:**
- Emoji or colorful icons, anywhere — nav, cards, buttons, seed/fixture data, DB-stored fields like `projects.icon`.
- Drop shadows, gradients, color accents, or corners rounder than `rounded-sm`.
- UI chrome font sizes above ~15px. Body text tops out around 13-14px; section labels are 9-10px.

**Always use:**
- Helvetica Neue / system sans (already the default via `font-sans` in `tailwind.config.js`).
- Black/white/gray only — `text-black` for primary, `text-gray-400/500/600` for secondary, `border-gray-100/200` for hairlines. Black is the only accent color (active nav state, active task border, done-status dot).
- Uppercase, letter-spaced micro-labels for section headers: `text-[9px] font-semibold uppercase tracking-widest text-gray-300` — see `SectionLabel` in `Sidebar.jsx` and `Section` in `DetailPanel.jsx`.
- The existing typographic symbol set instead of icons: `✕` (close/delete), `↗` (external link), `▸`/`▾` (expand/collapse). Don't introduce icon fonts or new symbols without a reason.
- `StatusIcon.jsx` conventions for status, reused everywhere rather than invented per-component: empty circle = todo, black square = blocked, gray filled circle = prepared, black filled circle = done, rotated diamond = question.

Canonical components to match when building anything new: `src/components/ui/StatusIcon.jsx`, `TaskRow.jsx`, `DetailPanel.jsx`, `src/components/layout/Sidebar.jsx`.

## Architecture conventions

- Schema changes go in `supabase/migrations/` (Supabase CLI format) — never hand-edit the remote DB without a matching migration file committed. Migrations auto-apply via Supabase's GitHub integration on push to `main`; they can also be applied directly through the Supabase MCP connection during a session, but the migration file is still the source of truth and should be committed either way.
- `tasks` is a generic, domain-agnostic table shared by Canada PR, Todos, and future projects. Domain-specific concerns belong in satellite tables linked via `task_id` (see `email_drafts` for the pattern) — don't add domain-specific columns to `tasks` itself.
- This is a public GitHub repo. Never commit personal or sensitive data — seed content, real task data, credentials. Fixture/seed scripts containing real personal data should live outside the repo (e.g. a local scratch directory) and be applied straight to Supabase via the MCP connection or CLI, not shipped as app code.
- Edge Functions (`supabase/functions/`) must set CORS headers and handle `OPTIONS` explicitly — browser calls via `supabase.functions.invoke()` fail preflight silently otherwise. Copy the pattern from an existing function rather than starting from a bare `Deno.serve`.
- Pages render inside `AppShell` via `<Outlet context={{ user, projects, refreshProjects }} />` — pull these with `useOutletContext()` rather than re-fetching auth/projects state in every page.
