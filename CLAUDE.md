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

## Task list + detail panel pattern

Any page that renders a set of tasks (Canada PR, Todos, and future project/task-type pages) should render through `src/components/tasks/TaskListView.jsx` rather than hand-rolling its own list/sidebar. The page owns data fetching (`useTasks`) and its own header chrome (title, countdown, quick-add form); `TaskListView` owns selection state, expand/collapse, and rendering `TaskRow`s + `DetailPanel`.

To add type-specific content to the detail panel (e.g. the email draft controls on Todos) without teaching `DetailPanel` or `TaskListView` about that domain, pass `getExtraSections(task) => [{ label, content }]` — rendered generically as extra `Section`s at the bottom of the panel. Pass `onDeleteTask(id)` if the page should support deleting a task from the panel (Canada PR intentionally doesn't). Pass `getRowBadge(task) => string | null` for a small pill in the list row itself (e.g. Todos shows "Reply"/"Unsubscribe"/"Archive" while pending, or the resolved outcome like "Sent"/"Archived" once acted on) — same idea as `getExtraSections`, just surfaced in the row instead of the panel. See `ProjectPage.jsx` for the minimal case and `TodosPage.jsx` for one using all three extension points.

## Architecture conventions

- Schema changes go in `supabase/migrations/` (Supabase CLI format) — never hand-edit the remote DB without a matching migration file committed. Migrations auto-apply via Supabase's GitHub integration on push to `main`; they can also be applied directly through the Supabase MCP connection during a session, but the migration file is still the source of truth and should be committed either way.
- `tasks` is a generic, domain-agnostic table shared by Canada PR, Todos, and future projects. Domain-specific concerns belong in satellite tables linked via `task_id` (see `email_drafts` for the pattern) — don't add domain-specific columns to `tasks` itself.
- This is a public GitHub repo. Never commit personal or sensitive data — seed content, real task data, credentials. Fixture/seed scripts containing real personal data should live outside the repo (e.g. a local scratch directory) and be applied straight to Supabase via the MCP connection or CLI, not shipped as app code.
- Edge Functions (`supabase/functions/`) must set CORS headers and handle `OPTIONS` explicitly — browser calls via `supabase.functions.invoke()` fail preflight silently otherwise. Copy the pattern from an existing function rather than starting from a bare `Deno.serve`.
- Pages render inside `AppShell` via `<Outlet context={{ user, projects, refreshProjects }} />` — pull these with `useOutletContext()` rather than re-fetching auth/projects state in every page.

## Finance section

Same division of labor as email triage: HQ does the mechanical, deterministic half; a Cowork scheduled task does the AI half.

- `financial_accounts` / `transactions` / `transaction_category_rules` — see `supabase/migrations/20260721222240_finance.sql`. `transactions.amount` is signed: positive = charge/spend, negative = payment/credit, so `sum(amount)` (excluding a "Payment" category) is net spend with no sign-flipping needed.
- HQ (`FinancePage.jsx`, `parseCibcCsv.js`, `useTransactions.js`) parses CSV exports client-side and inserts rows with `status='pending'`, `category`/`merchant`/`is_subscription` left unset. The `(account_id, txn_date, description, amount)` unique index makes re-uploading an overlapping export a no-op rather than a duplicate.
- A Cowork scheduled task reads `pending` rows, normalizes the merchant name, assigns a category, flags subscriptions, and flips `status='categorized'` — mirroring `email_triage_rules`, `transaction_category_rules` lets corrections steer future runs via a hard `category` override or freeform `guidance`.
- Realtime is on `transactions` so the categorization pass updates the UI live, same pattern as the email tables.
- `finance_recommendations` — AI-generated suggestions ("cancel this subscription to save $X/mo") surface as regular todos via the same `task_id` satellite pattern as `email_drafts`/`email_subscriptions`/`email_archive_candidates`, wired into `TodosPage.jsx`'s `getExtraSections`/`getRowBadge`. `finance_recommendation_rules` is the feedback/memory table — dismissing a recommendation with a reason writes both a `dismissal_reason` on the recommendation (shown back in the panel) and a rule (read by future Cowork runs), same shape as `email_triage_rules`. Manageable directly in Settings via `FinanceRulesSection`.
- `src/pages/finance/` has its own Dashboard/Transactions split (`FinanceDashboard.jsx`, `FinanceTransactions.jsx`, shared `FinanceHeader.jsx` tabs) — transactions are *not* tasks, so this is a bespoke list+detail split (`TransactionDetailPanel.jsx`) rather than `TaskListView`/`DetailPanel`, though it mirrors their visual conventions (360px right panel, `Section` blocks, sticky header with `✕` close). The detail panel surfaces subscription info and other transactions matching by `description`/`merchant` ("Other Occurrences").
