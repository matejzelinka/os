# Project analysis — Pracovní OS

## Scope and architecture

Pracovní OS is a Czech-language personal work-management single-page experience built with **Astro 7**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Zustand**. Astro supplies the route shells and static build; all application behavior is implemented in React islands hydrated with `client:only="react"`. It is intentionally local-first: tasks, projects, and custom workflows begin in browser storage and can optionally be mirrored to Supabase for a signed-in user.

There is no server-side application API, database ORM, router state library, test suite, or backend deployment configuration in the repository. Supabase is accessed directly from the browser using the public/anon client configuration.

## Project structure

```text
/
├── src/
│   ├── pages/            Astro route shells
│   ├── layouts/          Shared document shell and global client bootstrapping
│   ├── components/       React feature UI plus a small Astro component set
│   │   ├── capture/      Task/project capture
│   │   ├── dashboard/    Overview screen
│   │   ├── inbox/        Inbox page composition
│   │   ├── projects/     Project list, detail, picker
│   │   ├── tasks/        Task row, detail drawer, attachments
│   │   ├── today/        Due/overdue task view
│   │   ├── trash/        Soft-deleted task view
│   │   ├── upcoming/     Future-task grouping
│   │   ├── workflows/    Workflow template and instantiation UI
│   │   └── ui/           Shared button, card, input primitives
│   ├── store/            Zustand stores for tasks, projects, workflows
│   ├── lib/              Persistence, sync, Supabase, notifications, utilities
│   ├── types/            Task, project, and workflow domain types
│   └── styles/           Global Tailwind/CSS styles
├── public/               Manifest, service worker, and application icons
├── supabase/schema.sql   Database tables and RLS policies
├── .env.example          Public Supabase configuration template
├── SYNC-SETUP.md         Manual Supabase setup instructions
└── package.json          Astro build scripts and dependencies
```

## Pages and main components

| Route | React feature component | Purpose |
| --- | --- | --- |
| `/` | `DashboardPage` | Overview metrics, quick capture, urgent tasks, active projects |
| `/inbox` | `InboxInput` | Capture and list non-deleted tasks; opens `TaskDrawer` |
| `/today` | `TodayPage` | Due and overdue incomplete tasks |
| `/upcoming` | `UpcomingPage` | Future incomplete tasks grouped by due date |
| `/projects` | `ProjectsPage` | Create and view active projects |
| `/project?id=…` | `ProjectDetail` | Edit a project and its associated task titles/statuses |
| `/workflows` | `WorkflowCreator` | Instantiate built-in/custom templates and manage custom templates |
| `/trash` | `TrashPage` | Restore or permanently delete soft-deleted tasks |

`Layout.astro` provides global CSS, PWA meta tags, `MobileNav`, and `SyncBootstrap`. Standard desktop chrome is composed per page from `Sidebar.astro` and `Topbar.astro`; the top bar mounts `AppControls`, which contains theme, notification, and sync controls.

The key reusable feature components are:

- `CaptureBox`: creates a regular task or creates a project plus workflow-derived tasks.
- `TaskListItem`: task presentation used on dashboard, Inbox, Today, and Upcoming screens.
- `TaskDrawer`: the central task editor for title, project, due date, reminder, priority, note, subtasks, attachments, and soft deletion.
- `TaskAttachments`: IndexedDB-backed attachment management.
- `SyncControl`: Supabase sign-up/sign-in/out, automatic/manual synchronization status, and trigger controls.
- `AppControls`: theme preference and browser-notification control/alert list.
- `GlobalSearch`: an implemented command-palette search component; it is not currently mounted by the visible application shell.

Several Astro components under `src/components/dashboard/`, plus `TaskCard.astro`, `StatCard.astro`, and `SearchBox.astro`, look like an older static dashboard component set. `DashboardPage.tsx` is the active dashboard implementation.

## Stores

| Store | State | Primary operations | Persistence |
| --- | --- | --- | --- |
| `useInboxStore` | `InboxItem[]` | create, batch-create, update, complete, soft-delete, restore, permanent cleanup, subtasks | `localStorage` key `os-inbox` |
| `useProjectsStore` | `Project[]` | create, rename, recolor, archive | `localStorage` key `os-projects` |
| `useWorkflowStore` | custom `WorkflowTemplate[]` | create, update, delete templates | `localStorage` key `os-workflows` |

Task records include lifecycle timestamps, project association, priority, due/reminder dates, note text, and embedded subtasks. `norm` in the Inbox store applies backward-compatible defaults when stored task objects predate the current fields.

`src/store/app.ts` merely re-exports Inbox and Projects stores. Built-in workflows live separately in `src/lib/workflows.ts`; they are merged with custom workflows at read time by `allWorkflows`.

## Data flow

```text
React page/component
  → Zustand action
  → localStorage save (`os-inbox`, `os-projects`, `os-workflows`)
  → `markLocalChange()` updates `os-sync-meta` and dispatches `os-local-change`
  → `SyncControl` schedules `syncNow()`
  → Supabase `os_state` upsert/pull when configured and authenticated

Attachments follow a parallel path:
TaskAttachments → IndexedDB `pracovni-os-files` → optional Supabase `os_files` upsert
```

The app loads Zustand initial state synchronously from `localStorage` in the browser. User actions write the complete relevant collection back to storage. Most views derive filtered/sorted presentations directly from these collections rather than maintaining duplicate derived state.

Task completion sets `completed`, `completedAt`, and `deletedAt` together, so completed tasks immediately move into Trash. Deletion without completion only sets `deletedAt`. Restoring resets completion and deletion state. Trash cleanup permanently removes tasks (and their *local* attachments) after seven days.

The only task deep-link format is `/inbox?task=<id>`, created by `taskLink`. Inbox reads that parameter and opens the drawer; dashboard/today/upcoming drawer selection is component-local.

## Supabase integration

Client configuration is in `src/lib/supabase.ts`. A client is created only when `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are set and the URL is not the placeholder value. Authentication uses Supabase email/password APIs with persisted, refreshed browser sessions.

The SQL schema creates two user-owned tables:

| Table | Role |
| --- | --- |
| `public.os_state` | One JSONB snapshot per auth user (`payload`, `updated_at`) |
| `public.os_files` | Attachment metadata plus Data URL payload, keyed by attachment UUID |

Both tables have row-level security enabled and policies restricting selection/mutation to `auth.uid() = user_id`. The state snapshot contains serialized localStorage values, not a normalized relational representation. Attachments of 8 MB or less are additionally upserted into `os_files` during upload, following their IndexedDB write.

## Synchronization

`SyncControl` runs synchronization on mount, after Supabase auth events, 700 ms after `os-local-change`, every minute, and from the manual control. `syncNow` reads the remote `os_state` row then chooses one of three actions:

1. If no remote row exists, push the local snapshot.
2. If local metadata says a change happened after the last local sync, push the entire local snapshot.
3. If the server `updated_at` is newer than the local last-sync value, replace the three localStorage collections with the remote snapshot.

When a cloud snapshot is applied, `SyncBootstrap` listens for `os-cloud-applied` and reloads the page so Zustand is initialized from the new local data. This is a whole-state, last-writer-wins synchronization model. It has no realtime subscription, no field/item-level merge, no conflict UI, and no server version/concurrency condition.

Attachment synchronization is not symmetric: the app uploads qualifying attachments but never downloads `os_files` into IndexedDB, does not include attachment IDs in the task snapshot, and does not delete remote file rows on local deletion. As implemented, attachment cloud storage is write-only from this client.

## Notifications

Notifications are browser-local. `AppControls` asks the user for permission, registers `/sw.js`, and every 30 seconds checks open, non-deleted tasks whose `reminderAt` is in the past. Each reminder is deduplicated in localStorage with `os-notified:<taskId>:<reminderAt>`, then displayed through the service-worker registration. Due dates also populate the in-app alert count/list, but only a `reminderAt` triggers a system notification.

The service worker can handle notification click navigation and an unused `SHOW_NOTIFICATION` message protocol. Because reminder evaluation lives in a React effect, reminders are only checked while an application tab is running; this is not background push scheduling.

## PWA

The layout links `public/manifest.webmanifest`, declares standalone/mobile Apple metadata, and provides app icons. The manifest uses `display: "standalone"`, start URL `/`, and portrait orientation. The worker implements a runtime network-first cache for every successful GET request and falls back to a cache match offline. It claims clients immediately and skips waiting on install.

There is no install-prompt UX, precache manifest, cache-expiry strategy, navigation fallback, version migration, or offline data synchronization strategy. Service-worker registration currently occurs only through notification initialization, so a user who never grants/uses notifications may not get an active worker/PWA caching behavior.

## Current strengths

- Clear feature-oriented client structure with a small number of focused stores.
- Fast, local-first interaction with no backend requirement for baseline use.
- Sensible domain model for practical task management: projects, priorities, dates, notes, subtasks, workflows, Trash, and attachments.
- Reusable central task editor and task row avoid duplicated editing behavior across major task views.
- Optional Supabase setup is isolated and guarded by explicit environment configuration.
- Database schema includes user-scoped RLS for both state and attachments.
- Responsive desktop/sidebar and mobile/bottom-nav treatments are present.
- Browser permission states and error feedback are surfaced instead of assuming notifications work.
- Built-in workflow generation gives repeatable project/task creation without introducing a complex backend.

## Current weaknesses

- The browser is the source of truth, but persistence failures (`localStorage` quota, private browsing, IndexedDB errors) are mostly not surfaced to the user.
- Complete task lists are written for every mutation; data volume and write cost grow linearly with the collection.
- Completion is coupled to Trash, which may be surprising if completed work is intended to remain visible as history.
- ProjectDetail includes soft-deleted tasks in its `items` calculation, unlike standard task lists.
- Project archive state is writable but has no visible archive-management experience in the inspected active UI.
- `GlobalSearch` includes a `/settings` navigation result even though no matching page exists, and it is not mounted in the shell.
- Static/legacy dashboard components coexist with the active React dashboard, making ownership and intended UI paths less obvious.
- Visible Czech text and documentation exhibit character-encoding corruption (for example `PracovnĂ­`), reducing product/documentation quality.
- `README.md` contains unresolved Git conflict markers and stale Astro starter content.
- `npm ci` cannot reproduce dependencies because `package-lock.json` is out of sync with `package.json` (the lock lacks `@emnapi/runtime`).

## Technical debt

1. **Snapshot sync conflict behavior.** Per-device `lastLocalChange`/`lastSync` metadata plus full-state upserts can overwrite concurrent edits. The client never uses the remote timestamp as an optimistic-concurrency precondition.
2. **Attachment lifecycle divergence.** Remote attachment rows are not pulled or deleted, and task-state snapshots do not reference them. This leads to unbounded orphan cloud rows and no cross-device attachment access.
3. **Data validation and migrations.** Local JSON is accepted with only parsing and basic Inbox defaults. There is no schema validation, versioned migration, or recovery flow for malformed/incompatible data.
4. **Error handling and observability.** Several async paths silently swallow errors, notably cloud attachment upload and notification calls. There is no logging, monitoring, or user-visible retry state for these cases.
5. **PWA caching policy.** Cache-all runtime behavior can grow indefinitely and can cache responses that are inappropriate to store; it has no cleanup, preload, or offline navigation semantics.
6. **Notification delivery model.** The design cannot notify when the app is closed. It needs web push/background scheduling infrastructure for reliable reminders.
7. **UI duplication and route composition.** Every Astro page manually composes the same Layout/Sidebar/Topbar structure instead of using a shared application page shell.
8. **Testing and quality gates.** No automated unit, component, integration, end-to-end, type-check, lint, or formatting scripts were found.
9. **Documentation/repository hygiene.** The README conflict markers, encoding damage, stale static components, and non-reproducible lockfile make onboarding and releases fragile.

## Suggestions for future architecture

These are recommended future directions, not changes made by this analysis.

1. Establish a canonical persisted domain model with per-entity IDs, `updatedAt`, `deletedAt`, and a schema/migration layer (for example Zod validation at local and remote boundaries).
2. Move from whole-snapshot synchronization to entity-level Supabase tables (tasks, projects, workflows, attachments) with stable versions or updated-at concurrency checks. Define a conflict policy deliberately and expose resolution when automatic merging is unsafe.
3. Store attachments in Supabase Storage rather than JSON Data URLs in a database row; persist attachment metadata/ownership with the task and implement download/delete reconciliation.
4. Separate application state from persistence and sync orchestration: keep Zustand mutations domain-focused, then use a persistence adapter/outbox to record changes and synchronize them.
5. Introduce a small client-side selector/service layer for shared task queries (open, today, overdue, project tasks) to centralize lifecycle filters and sorting rules.
6. Register the PWA worker independently of notifications; replace cache-all runtime logic with a versioned, bounded cache strategy and explicit offline fallback.
7. Use Web Push (or a server-side scheduled notification service) for reminders that must arrive with no open app tab.
8. Add CI gates for `npm ci`, production build, TypeScript checking, linting/formatting, and focused tests for store mutations, sync conflict cases, and notification eligibility.
9. Resolve documentation conflicts, normalize UTF-8 encoding, remove or formally adopt unused components, and make the README describe the actual application/setup path.
