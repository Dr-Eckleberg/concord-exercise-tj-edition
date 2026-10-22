# Waypoint advisor workspace

An interactive, desktop-first React prototype based on the four supplied design
boards. It uses coherent fictional fixtures, not the original employee CSV.

## Run

Requires Bun and Node.js 22.13 or newer.

```sh
bun install
bun run dev
```

Open the localhost URL printed by Vite.

```sh
bun run build   # TypeScript and production build
bun run test    # State, workflow, scope, and date regression tests
bun run check   # Repository Biome / Ultracite checks
```

## Workspace

- **My work:** scoped urgent actions, profile reviews, outstanding requests,
  approved cases, and upcoming planning dates.
- **Profile review:** five evidence-backed sections, previous/current answers,
  mock document previews, internal notes, clarification conversations, and
  explicit approval with an audit record.
- **Cases:** active/closed views, six-row pagination, combined filters,
  configurable columns, sorting, saved views, and separate drafts linked to
  existing people.
- **Compliance:** recorded dates, administrative verification, renewal planning,
  an obligation calendar, employer planning checks, and a fictional policy-impact
  exercise.
- **Supporting panels:** people and client directories, case details, tasks,
  history, simulated messages, and preparation placeholders.

Client scope applies throughout the workspace. A person can have multiple cases:
the initial fixture has **25 cases and 24 people**, including Chen's separate
active and closed cases.

## Demo behavior

- The reference date is always **18 Oct 2026**, using calendar dates rather than
  the machine's timezone.
- A. Singh is the current advisor and has demo access to all advisors' cases.
- Committed changes survive navigation and browser Back/Forward within the tab.
  Reload restores the initial fictional records. The Demo menu also offers an
  explicit reset.
- Initial work totals are **2 urgent / 3 review / 4 waiting / 2 ready**.
  Compliance totals are **6 past expiries / 4 within 120 days / 1 passport within
  six months / 3 employer obligations**. Counts recalculate after local changes
  and client/advisor filtering.
- Information completeness, section review, advisor approval, application stage,
  preparation, and case closure remain separate. Approval requires complete
  information, reviewed sections, resolved requests, and an assigned advisor.
- The Demo menu on Profile review can simulate a material client update. It
  increments the profile version, reopens the changed section, and invalidates
  approval without undoing application progress.
- Documents are readable placeholders. Messages, policy tasks, approvals, and
  preparation are local simulations; no external services are called.
- Recorded expiry dates and verification outcomes are **not legal
  determinations of permission or work rights**.

The visual references are [My work](public/01-my-work.png),
[Profile review](public/02-profile-review.png),
[Case register](public/03-case-register.png), and
[Compliance](public/04-compliance.png). Presentation annotations and design-board
framing are intentionally excluded from the application.
