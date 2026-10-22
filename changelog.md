# Waypoint redesign changelog

## Scope

This document records the application redesign, including the file-by-file and
function-by-function changes, prototype design, and regression coverage.
The fixed application reference date is **18 Oct 2026**, independent of the
actual date on which the prototype is used.

Unless explicitly described as modified or removed, the functions below are new.
Small inline rendering, mapping, and event callbacks are covered by their parent
function; meaningful named local handlers are listed separately.

The redesign replaces the CSV-backed dashboard with an interactive fictional
advisor workspace. Information completeness, section review, advisor approval,
government application stage, preparation, and case closure remain separate.
All document, message, approval, policy, and preparation operations are local
simulations, not external services or legal determinations.

## File and function changes

### [src/data/workspace.ts](src/data/workspace.ts)

Adds the typed fictional data model, fixture creation, derived statuses and
counts, validation, audit history, and local state transitions. The original CSV
is not imported or reconciled.

#### Dates and identity

| Function | Change |
| --- | --- |
| `isDate` | Validates exact ISO calendar dates and rejects impossible dates instead of allowing rollover. |
| `formatDate` | Displays unambiguous day-month-year dates; absent dates become "Not recorded". |
| `daysFromToday` | Calculates calendar-day differences against the fixed demo date with UTC arithmetic. |
| `addDays` | Adds calendar days and returns an ISO date across month/year boundaries. |
| `initials` | Generates initials for the screenshot-style avatars. |
| `fictionalEmail` | Generates fictional contact addresses, including surname-first display names. |
| `emailFor` | Exposes consistent fictional email generation to workflows and panels. |

#### Fixtures and audit infrastructure

| Function | Change |
| --- | --- |
| `sectionIds` | Returns the five profile sections in their defined display order. |
| `profileSections` | Creates client fields, illustrative documents, checklists, reviewed versions, and internal notes. |
| `profileSections.section` | Builds a consistent individual section, distinguishing reviewed and unreviewed initial states. |
| `caseFromSeed` | Converts a fixture row into a typed case with independent lifecycle states. |
| `createDemo` | Constructs 25 cases and 24 people, Isabella's versioned profile, requests, planning tasks, recorded expiries, approvals, and initial history. |
| `nextId` | Generates ordered identifiers for events, messages, requests, and tasks. |
| `log` | Records dated, ordered history with category, case/client association, and internal/client-visible classification. |
| `requireCase` | Looks up a case and throws an explicit demo error if missing. |
| `requireObligation` | Performs validated obligation lookup. |
| `requireRequest` | Performs validated request lookup. |
| `addObligation` | Creates obligations with consistent client, ownership, completion, and source defaults. |
| `seedRequest` | Creates initial conversations, optional client replies, communication history, and outstanding follow-up obligations. |

The fixtures include four employers, three advisors plus Unassigned, five profile
sections, seven fictional policy candidate cases, confirmed expiry dates, and
separate active/closed cases for Chen, Wei. Initial work counts are
**2 urgent / 3 review / 4 waiting / 2 ready**. Initial compliance counts are
**6 past expiries / 4 within 120 days / 1 passport within six months /
3 employer obligations**.

#### Derived state and scope

| Function | Change |
| --- | --- |
| `requestsFor` | Retrieves requests for a particular case. |
| `reviewCode` | Derives readiness from outstanding requests, replies, stored review state, and explicit approval. |
| `pendingSections` | Identifies sections without a valid reviewed version. |
| `changedSections` | Identifies client-changed sections still awaiting review. |
| `approvalBlockers` | Lists incomplete information, pending sections, unresolved requests, and missing advisor assignment. |
| `caseInScope` | Applies client and advisor scope without changing ownership. |
| `queueCases` | Calculates urgent/review/waiting/ready queues, excludes closed cases, and removes preparation-started cases from ready work. |
| `obligationsInScope` | Filters obligations by client/advisor, respecting inherited case ownership. |
| `complianceCounts` | Calculates past expiries, the inclusive 120-day window, passport window, and open employer obligations. |
| `matchesCategory` | Applies a selected compliance category independently from summary calculations. |
| `nextDeadline` | Finds the earliest open government/internal/follow-up date, excluding recorded expiries. |
| `needsVerification` | Identifies intentional administrative work: unassigned cases and missing government-response dates. |
| `nextAction` | Produces consistent action text and ownership, prioritizing urgent work, explicit actions, requests, reviews, preparation, and monitoring. |
| `nextAction.preparationAction` | Distinguishes starting preparation from continuing it without implying filing. |

#### Validation and transitions

| Function | Change |
| --- | --- |
| `textRequired` | Trims required text and enforces workflow-specific length limits. |
| `dateRequired` | Rejects missing or invalid exact dates. |
| `invalidateApproval` | Removes current approval and returns review to an unapproved state. |
| `applyAction` | Clones state and dispatches typed actions so failed operations do not partially mutate the original. |
| `createDraft` | Creates a unique active, unfiled draft linked to an existing person with zero supplied information and no automatic tasks. |
| `applyPolicyAction` | Creates selected policy-review tasks or records simulated messages; requires explicit ownership for unassigned cases and prevents duplicate case/policy tasks. |
| `savePlanning` | Adds/edits planning obligations with title, owner, and date validation; excludes government deadlines and recorded expiries from generic editing. |
| `applyDateAction` | Completes/reopens tasks or records verification outcomes and date corrections; recorded expiries cannot be completed. |
| `applyRequestAction` | Records reminders, resolves reviewed client replies, or reopens requests/follow-ups and invalidates approval. |
| `applyCaseAction` | Handles opening/reopening review, internal notes, assignment, government deadlines, preparation, and delegation to specialized transitions. |
| `reviewSection` | Requires every checklist item, records the reviewed profile version, and logs the decision without resolving requests. |
| `approveRecord` | Requires zero blockers, prevents duplicate approval, and records actor/version/date without changing application stage. |
| `createClarification` | Creates a section-linked simulated request and dated follow-up, invalidates approval, and records client-visible history. |
| `saveNextAction` | Creates/edits a task without duplicate obligations, resolves Lucia's missing-next-action urgency, and synchronizes request follow-up dates/types. |
| `simulateClientUpdate` | Increments profile version, changes the selected section, resets its checks, invalidates approval, and simulates relevant replies while preserving other reviews and application stage. |

### [src/workspace-context.tsx](src/workspace-context.tsx)

Adds shared React state, navigation, browser-history integration, overlay stacking,
scoped unsaved-change protection, notifications, focus tracking, and saved views.

| Function | Change |
| --- | --- |
| `defaultFilters` | Creates unrestricted case-register filters. |
| `focusedElement` | Captures an HTML focus target for later restoration. |
| `dirtyScopes` | Groups dirty inputs by screen or overlay scope. |
| `retainsDraftScope` | Determines whether navigation preserves a draft, avoiding unnecessary discard prompts. |
| `initialNavigation` | Defines initial destination, scopes, filters, section, calendar, columns, and selection. |
| `navigationFromUrl` | Parses supported hash routes and maps unsupported destinations/sections to a friendly not-found state. |
| `urlFor` | Serializes primary destinations and review case/section selection into URLs. |
| `useWorkspace` | Exposes shared state/actions and fails explicitly outside the provider. |
| `useDirty` | Registers and cleans up unsaved state within the current scope. |
| `WorkspaceProvider` | Owns demo records, navigation, saved views, notifications, focus targets, and discard confirmation. |

Named provider operations:

| Operation | Change |
| --- | --- |
| `registerDirty` | Adds/removes dirty-input registrations and updates consumers. |
| `hasDirty` | Tests all drafts or one scope. |
| `commitNavigation` | Synchronizes React navigation with indexed browser-history entries. |
| `guard` | Prompts only when an operation would abandon dirty scopes. |
| `pop` | Handles Back/Forward, restores the current entry while asking for confirmation, and preserves Forward history. |
| `pop.apply` | Applies an accepted historical navigation entry. |
| `notify` | Creates notices; success messages expire after four seconds, while errors remain dismissible. |
| `navigate` | Applies screen/filter changes with unsaved-change protection. |
| `open` | Pushes a uniquely keyed overlay and captures its opener. |
| `replaceSurface` | Replaces the foreground surface while retaining appropriate state and return focus. |
| `close` | Closes only the top overlay and guards its dirty inputs. |
| `change` | Applies domain actions and surfaces expected demo errors; unexpected errors are rethrown. |
| `openReview` | Opens review with origin, selected section, and return location. |
| `backFromReview` | Returns to the originating workspace/filter state instead of always going home. |
| `reset` | Restores fixtures, navigation, saved views, dirty tracking, and focus bookkeeping. |
| `saveView` | Snapshots register tab, filters, columns, and sorting. |
| `openCase` | Opens the shared case drawer at the requested tab. |
| `returnFocusFor` | Retrieves the recorded opener for a surface. |
| `deleteView` | Removes a saved view and reports the local change. |

Provider effects also lock background scrolling, update page titles, restore
screen scroll positions, and manage notification timers. Discarding an overlay
draft does not discard an underlying unsaved internal note.

### [src/components/ui.tsx](src/components/ui.tsx)

Adds reusable visual controls and accessible interaction primitives.

| Function | Change |
| --- | --- |
| `Icon` | Renders consistent decorative line icons without external assets. |
| `Button` | Standardizes primary, secondary, small, and disabled buttons. |
| `LinkButton` | Provides semantic buttons with link-style presentation. |
| `Select` | Adds labeled native dropdowns with consistent presentation. |
| `Avatar` | Renders initials with optional size and tint. |
| `Badge` | Standardizes status-chip colors and typography. |
| `ReviewBadge` | Maps readiness codes to explicit labels and tones. |
| `AdvisorFilter` | Reuses advisor options across work/register/compliance. |
| `Count` | Renders noninteractive section counts. |
| `Empty` | Provides explicit empty states and optional filter reset. |
| `Tabs` | Adds selected state, roving tab stops, and Arrow/Home/End navigation. |
| `Overlay` | Implements dialogs/drawers, Escape, focus trapping, opener restoration, inactive-layer isolation, and controlled outside-click dismissal. |

### [src/components/forms.tsx](src/components/forms.tsx)

Adds validated local-edit forms and preview-before-record messaging.

| Function | Change |
| --- | --- |
| `focusInvalid` | Focuses the first invalid field after submission. |
| `fieldError` | Validates required text, length, exact dates, and minimum dates. |
| `ActionForm` | Renders conditional fields, inline errors, dirty tracking, Save, and Cancel. |
| `ActionForm.submit` | Validates visible fields and workflow-specific rules before saving local changes. |
| `ClientMessageForm` | Separates editing from exact client-visible preview and explicit simulated recording. |
| `ClientMessageForm.submit` | Requires valid message text and, where applicable, a follow-up on/after the demo date. |
| `NewCaseForm` | Adds scoped person selection, renewal prefills, optional assignment, and duplicate warnings. |
| `NewCaseForm.create` | Creates a separate linked draft and replaces the form with its case panel. |
| `NewCaseForm.submit` | Validates person/route/country and checks active duplicates before creation. |
| `WorkflowForm` | Dispatches surfaces to specialized forms. |
| `SupportingWorkflowForm` | Implements saved-view names, policy tasks/messages, planning obligations, and new-case entry. |
| `VerificationForm` | Records source/outcome and optional replacement dates, with linked cases and renewal planning. |
| `CaseWorkflowForm` | Implements section clarification, assignment, and sourced government-response deadlines. |
| `NextActionForm` | Edits text, owner, assignee, date, and type; request follow-ups must stay dated follow-up obligations. |

Internal notes are never included in client-visible previews. Required fields
show inline errors after submission and retain valid input.

### [src/components/surfaces.tsx](src/components/surfaces.tsx)

Adds lightweight shared destinations rather than extra full application screens.

| Function | Change |
| --- | --- |
| `HistoryList` | Displays reverse-chronological, category-filtered audit history with visibility labels. |
| `HistoryDialog` | Hosts standalone case history with local filter state. |
| `CaseOverview` | Shows separate readiness/application states, approval provenance, next action, advisor, preparation, and dates. |
| `CaseTasks` | Lists open/completed tasks and inspectable client requests. |
| `EvidenceResponse` | Adds Lucas's deadline and task-completion workflow without changing government application stage. |
| `CasePanel` | Combines case context and Overview/Tasks/History/Evidence tabs while retaining local tab content state. |
| `CaseLinks` | Reuses links to individual cases without conflating a person's cases. |
| `PeopleDirectory` | Shows scoped searchable distinct people and case counts. |
| `PersonDetail` | Shows fictional identity/contact, illustrative permissions, recorded dates, and linked cases. |
| `ClientsDirectory` | Adds searchable clients and case counts. |
| `ClientDetail` | Shows linked cases and scoped register/employer-compliance entry points. |
| `EmployerPanel` | Filters employer planning obligations and exposes creation/detail workflows. |
| `obligationStatus` | Distinguishes recorded dates from open/completed tasks. |
| `ObligationDetail` | Shows source, owner, date, status, and links; routes editing to planning/government/verification workflows. |
| `DayEvents` | Lists a calendar day's obligations using current scope/category/type filters. |
| `DocumentPreview` | Shows readable fictional content, bounded document navigation, and 50-200% zoom in 25% steps. |
| `ApprovalReadiness` | Explains every requirement, links to blockers, and enables explicit approval only when eligible. |
| `RequestConversation` | Shows simulated chronological messages, reviewed-response resolution, reopening, and previewed reminders. |
| `GlobalSearch` | Adds scoped grouped Person/Case/Client results, keyboard selection, Clear, and empty states. |
| `GlobalSearch.matches` | Performs case-insensitive identity/case ID/employer/route/country matching. |
| `RegisterControls` | Implements configurable columns, immediate readiness selection, and staged advanced-filter Apply/Cancel behavior. |
| `SavedViews` | Applies/deletes register configurations without overriding global client scope. |
| `PolicyPanel` | Supports explicit fictional candidate selection, task creation, and previewed advisory drafts. |
| `PolicyPanel.created` | Detects existing case/policy tasks and prevents duplicates. |
| `ConfirmationSurface` | Confirms approval, completion, preparation, reset, simulated updates, and saved-view deletion. |
| `Utilities` | Adds About, current-user information, mobile navigation, and demo utilities. |
| `SurfaceBody` | Dispatches the typed surface union to corresponding content. |
| `SurfaceHost` | Supplies titles, sizing, active-layer handling, scoped dirty guards, stable keys, and opener focus restoration. |

### [src/screens/work.tsx](src/screens/work.tsx)

Adds the action-oriented My work screen.

| Function | Change |
| --- | --- |
| `followUpLabel` | Produces fixed-date follow-up labels or an explicit missing-date label. |
| `workCopy` | Produces queue-specific task descriptions, metadata, and action labels. |
| `WorkRow` | Renders avatar, employer, route, work reason, status, and contextual action. |
| `WorkRow.run` | Opens profile review, reminder conversation, evidence response, or case overview according to queue context. |
| `MyWork` | Adds calculated metrics, toggleable queues, previews/show-all, stable submission sorting, upcoming dates, ready-case navigation, and empty-state resets. |

Queue metrics count cases with relevant open work rather than documents/sections.
Coming up excludes request follow-ups to avoid duplicate listing, and the
ready-case entry resets unrelated register filters.

### [src/screens/review.tsx](src/screens/review.tsx)

Adds the dedicated profile-review workspace.

| Function | Change |
| --- | --- |
| `SectionReview` | Displays read-only answers, previous/current comparisons, evidence, checklists, internal notes, and linked requests; tracks unsaved checks/notes. |
| `ProfileReview` | Adds origin-aware return, identity, independent readiness signals, ordered sections, changed/reviewed markers, post-filing notice, and approval-readiness entry. |

Reviewing a section does not resolve its requests. Previously reviewed versions
remain recognizable after a client update, while the changed section and profile
approval require fresh review.

### [src/screens/cases.tsx](src/screens/cases.tsx)

Adds the case register and portfolio-management controls.

| Function | Change |
| --- | --- |
| `matchesTab` | Defines Active/My/Ready/Needs verification/Closed membership independently of government application approval. |
| `matchesFilters` | Combines advisor, country, readiness, text, route, stage, and waiting-on filters. |
| `compareDeadlines` | Sorts deadlines with missing dates last and case-ID tie-breaking. |
| `compareCases` | Supports fixture order, person, advisor, and deadline sorting in both directions. |
| `CaseRegister` | Adds six-row pagination, tabs, chips, optional columns, saved views, new cases, and accessible row opening. |
| `CaseRegister.updateFilters` | Applies changes and resets pagination. |
| `CaseRegister.clearFilters` | Resets local filters without removing client scope. |
| `CaseRegister.toggleSort` | Toggles supported header sorts and resets pagination. |
| `CaseRegister.renderCell` | Renders separate readiness, completeness, application, task, advisor, and date meanings for each column. |

### [src/screens/compliance.tsx](src/screens/compliance.tsx)

Adds dated oversight, renewal planning, and a calendar.

| Function | Change |
| --- | --- |
| `VerifyRow` | Shows a past recorded expiry, identity, advisor, verification outcome, and Verify status. |
| `EmployerAndPolicyRail` | Displays employer obligations, scoped fictional policy candidates, and the work-rights limitation. |
| `ComplianceList` | Adds expandable past records, upcoming visa/passport dates, renewal/message actions, and category-specific employer lists. |
| `ComplianceList.clear` | Restores category/type/advisor filtering while retaining client scope. |
| `shiftMonth` | Moves between months using UTC arithmetic. |
| `ComplianceCalendar` | Adds a Monday-first grid, fixed Today, event/day details, extra-event links, undated tasks, past records, and expandable hidden-by-filter items. |
| `Compliance` | Composes calculated metrics, advisor/category/type filters, List/Calendar switching, and fixed-reference-date information. |

Summary counts remain independent of their own category/type selection. Empty
calendar type selection means no events. Recorded expiries are not tasks and do
not determine work rights.

### [src/app.tsx](src/app.tsx)

Replaces the CSV-backed Visa Tracking dashboard with the Waypoint shell.

| Function | Change |
| --- | --- |
| `Sidebar` | Adds branding, primary navigation, directory panels, current user, and origin-aware active navigation. |
| `Topbar` | Adds client scope, global search, review breadcrumbs, mobile menu, fixed compliance date, and demo indicator. |
| `WorkspaceShell` | Renders screens, not-found recovery, skip link, overlays, and inert background while dialogs are open. |
| `App` (modified) | Replaces local CSV loading/filtering/table logic with the shared provider and shell. |
| Former `rowKey` (removed) | Removes CSV-row fallback keys; fixture cases now have explicit stable IDs. |

### [tests/workspace.test.mjs](tests/workspace.test.mjs)

Adds dependency-free Node regression tests.

| Helper | Change |
| --- | --- |
| `getCase` | Retrieves a case and asserts fixture integrity. |
| `totals` | Calculates all four queues for a requested scope. |
| `reviewAll` | Completes every section through the real action API. |
| `approveIsabella` | Creates an approved fixture through review, request resolution, and explicit approval. |

Individual test callbacks cover:

1. Fixture integrity: 25 cases, 24 people, active monitoring and separate closed cases.
2. Client/advisor queue scope without ownership mutation.
3. Initial compliance metrics and fixed-reference relative dates.
4. Invalid/ambiguous date rejection and calendar boundaries.
5. Section review does not resolve requests or imply approval.
6. Approval records actor/version/date and never files.
7. Incomplete information blocks approval even after section reviews.
8. Assignment requirements and administrative verification.
9. Clarification invalidates approval while retaining completed section decisions.
10. Material client updates increment version and retain unaffected reviews.
11. Unanswered requests keep cases waiting; replies remain unresolved.
12. Reopened requests restore follow-ups and invalidate approval.
13. Internal notes never leak into client-visible requests/reminders.
14. Preparation removes ready work without changing approval or filing.
15. Government deadlines clear verification while response work stays urgent.
16. Lucia's next action clears urgency; edits do not duplicate dates.
17. Assignment updates inherited task ownership without erasing past approval.
18. Unchanged past-date verification preserves counts; corrections recalculate.
19. Employer add/edit/complete/reopen shares one obligation.
20. Policy tasks require explicit unassigned ownership and prevent duplicates.
21. New drafts link existing people without merging cases or creating tasks.
22. Invalid actions fail explicitly without mutating original state.
23. Category membership is independent of summary totals and type toggles.
24. Date windows include today/exact endpoints but exclude the following day.
25. Request follow-up editing synchronizes its conversation and retains date/type.

### [package.json](package.json)

Adds `bun run test`, using `node --experimental-strip-types --test`.
No new dependencies or production integrations are introduced.

### [README.md](README.md)

Replaces the design brief with setup and operating documentation: run/validation
commands, screen descriptions, fixture counts, per-tab state/reset behavior,
fixed date, approval rules, local-simulation limits, and visual references.

### [index.html](index.html)

Updates the title to Waypoint, adds the fictional-workspace description, and
sets the browser theme color to match the redesigned interface.

### [src/index.css](src/index.css)

Replaces the old dashboard stylesheet with screenshot-derived tokens and layouts:

- Warm neutral surfaces, green primary actions, consistent status tones, borders,
  spacing, typography, avatars, and simple controls.
- Sidebar/topbar shell, work queues/right rail, three-column profile review,
  configurable register, compliance list, and Monday-first calendar.
- Shared forms, document previews, conversations, history, dialogs/drawers,
  notifications, and confirmation states.
- Keyboard-focus, hover, selected, disabled, and error presentation.
- Compact desktop and mobile breakpoints, horizontally scrollable table/section
  containers, full-width phone panels, and accessible mobile navigation/search.
- Profile-section overflow correction, mobile touch targets, count contrast
  refinement, and readable wrapped status labels.

There are no JavaScript functions in this file. The stylesheet defines the
redesigned interface's visual language and responsive presentation.

### [changelog.md](changelog.md)

Adds this root-level file/function inventory, prototype design details, and
regression coverage. No runtime behavior is changed.

### Unchanged supporting code

The existing [CSV loader](src/data/load-employees.ts),
[prioritisation utilities](src/data/prioritise.ts),
[legacy card](src/components/card.tsx), [bootstrap](src/main.tsx), and build/lint
configuration are not part of the redesign edits. The old CSV path is no longer
used by the redesigned application, but its source files are not deleted.

## Validation record

During implementation, the production build/type-check, all 25 automated tests,
and changed-file lint passed. Browser checks exercised approval/clarification,
preparation, register controls, drafts, deadlines, employer planning, policy
actions, keyboard focus, and Back/Forward behavior. Twenty-five responsive
checks covered five views at widths from 320 to 1440 pixels with no page-level
horizontal overflow after corrections.

Repository-wide lint previously reported eight pre-existing formatting errors in
untouched files; those unrelated files were deliberately not reformatted.
