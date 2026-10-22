import type { ReactNode } from "react";
import {
  AdvisorFilter,
  Badge,
  Button,
  Empty,
  Icon,
  LinkButton,
  ReviewBadge,
  Select,
  Tabs,
} from "../components/ui";
import {
  ADVISORS,
  type CaseRecord,
  CLIENTS,
  COUNTRIES,
  type Country,
  caseInScope,
  type DemoState,
  formatDate,
  needsVerification,
  nextAction,
  nextDeadline,
  REVIEW_LABELS,
  reviewCode,
} from "../data/workspace";
import {
  type CaseFilters,
  type CaseSort,
  type CaseTab,
  COLUMN_LABELS,
  type Column,
  defaultFilters,
  useWorkspace,
} from "../workspace-context";

const CASE_TABS: { value: CaseTab; label: string }[] = [
  { value: "active", label: "Active cases" },
  { value: "mine", label: "My cases" },
  { value: "ready", label: "Ready for casework" },
  { value: "verification", label: "Needs verification" },
  { value: "closed", label: "Closed" },
];

function matchesTab(
  state: DemoState,
  record: CaseRecord,
  tab: CaseTab
): boolean {
  if (tab === "closed") {
    return record.closed;
  }
  if (record.closed) {
    return false;
  }
  if (tab === "mine") {
    return record.advisor === "AS";
  }
  if (tab === "ready") {
    return (
      reviewCode(state, record) === "P" &&
      record.stage === "Not filed" &&
      !record.preparation
    );
  }
  return tab !== "verification" || needsVerification(state, record);
}

function matchesFilters(
  state: DemoState,
  record: CaseRecord,
  filters: CaseFilters
): boolean {
  return (
    (filters.advisor === "all" || record.advisor === filters.advisor) &&
    (filters.country === "all" || record.country === filters.country) &&
    (!filters.readiness.length ||
      filters.readiness.includes(reviewCode(state, record))) &&
    (!filters.search.trim() ||
      `${record.name} ${record.id}`
        .toLowerCase()
        .includes(filters.search.trim().toLowerCase())) &&
    (!filters.routes.length || filters.routes.includes(record.route)) &&
    (!filters.stages.length || filters.stages.includes(record.stage)) &&
    (!filters.owners.length ||
      filters.owners.includes(nextAction(state, record).owner))
  );
}

function compareDeadlines(
  state: DemoState,
  a: CaseRecord,
  b: CaseRecord,
  direction: number
): number {
  const first = nextDeadline(state, a)?.date;
  const second = nextDeadline(state, b)?.date;
  if (!(first && second)) {
    return first ? -1 : second ? 1 : a.id.localeCompare(b.id);
  }
  return direction * first.localeCompare(second) || a.id.localeCompare(b.id);
}

function compareCases(
  state: DemoState,
  sort: CaseSort,
  a: CaseRecord,
  b: CaseRecord
): number {
  if (sort === "custom") {
    return 0;
  }
  const direction = sort.endsWith("-desc") ? -1 : 1;
  if (sort === "deadline" || sort === "deadline-desc") {
    return compareDeadlines(state, a, b, direction);
  }
  const comparison =
    sort === "name" || sort === "name-desc"
      ? a.name.localeCompare(b.name)
      : ADVISORS[a.advisor].localeCompare(ADVISORS[b.advisor]);
  return direction * comparison || a.id.localeCompare(b.id);
}

export function CaseRegister() {
  const { demo, nav, navigate, open, openCase, savedViews } = useWorkspace();
  const updateFilters = (patch: Partial<CaseFilters>) =>
    navigate({ filters: { ...nav.filters, ...patch }, page: 1 });
  const clearFilters = () => navigate({ filters: defaultFilters(), page: 1 });
  const filtered = demo.cases
    .filter(
      (record) =>
        caseInScope(record, nav.client) &&
        matchesTab(demo, record, nav.caseTab) &&
        matchesFilters(demo, record, nav.filters)
    )
    .sort((a, b) => compareCases(demo, nav.sort, a, b));
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const page = Math.min(nav.page, pages);
  const rows = filtered.slice((page - 1) * 6, page * 6);
  const chips: { label: string; clear: () => void }[] = [];
  if (nav.filters.advisor !== "all") {
    chips.push({
      label: ADVISORS[nav.filters.advisor],
      clear: () => updateFilters({ advisor: "all" }),
    });
  }
  if (nav.filters.country !== "all") {
    chips.push({
      label: COUNTRIES[nav.filters.country],
      clear: () => updateFilters({ country: "all" }),
    });
  }
  if (nav.filters.search) {
    chips.push({
      label: `Search: ${nav.filters.search}`,
      clear: () => updateFilters({ search: "" }),
    });
  }
  for (const code of nav.filters.readiness) {
    chips.push({
      label: REVIEW_LABELS[code],
      clear: () =>
        updateFilters({
          readiness: nav.filters.readiness.filter((value) => value !== code),
        }),
    });
  }
  for (const field of ["routes", "stages", "owners"] as const) {
    for (const value of nav.filters[field]) {
      chips.push({
        label: value,
        clear: () =>
          updateFilters({
            [field]: nav.filters[field].filter((item) => item !== value),
          }),
      });
    }
  }
  const toggleSort = (column: Column) => {
    const name = column === "person" ? "name" : column;
    if (name === "name" || name === "advisor" || name === "deadline") {
      navigate({ sort: nav.sort === name ? `${name}-desc` : name, page: 1 });
    }
  };
  const renderCell = (record: CaseRecord, column: Column): ReactNode => {
    const action = nextAction(demo, record);
    const deadline = nextDeadline(demo, record);
    switch (column) {
      case "person":
        return (
          <>
            <button
              className="case-row-opener"
              onClick={() => openCase(record.id)}
              title={`Open ${record.name}, ${record.id}`}
              type="button"
            >
              {record.name}
            </button>
            <div className="sub">{CLIENTS[record.client]}</div>
          </>
        );
      case "route":
        return (
          <>
            {record.route}
            <div className="sub">{COUNTRIES[record.country]}</div>
          </>
        );
      case "profile":
        return (
          <>
            <ReviewBadge code={reviewCode(demo, record)} />
            <div className="sub">{record.supplied}% information supplied</div>
          </>
        );
      case "application":
        return (
          <>
            {record.stage}
            {record.preparation && (
              <div className="sub">Preparation started</div>
            )}
          </>
        );
      case "action":
        return (
          <>
            {action.title}
            <div
              className={`sub ${record.id === "C02" && needsVerification(demo, record) ? "red-text" : ""}`}
            >
              {action.owner} · {action.detail}
            </div>
          </>
        );
      case "advisor":
        return record.advisor ? (
          ADVISORS[record.advisor]
        ) : (
          <Badge tone="amber">Unassigned</Badge>
        );
      case "id":
        return record.id;
      case "deadline":
        return formatDate(deadline?.date);
      case "deadlineType":
        return deadline?.type ?? "Not recorded";
      case "expiry":
        return formatDate(
          demo.obligations.find(
            (item) => item.caseId === record.id && item.type === "Visa expiry"
          )?.date
        );
      default:
        return null;
    }
  };
  return (
    <main className="content">
      <header className="heading">
        <div>
          <h1>Cases</h1>
          <p>
            A portfolio view. Profile readiness and application progress stay
            separate.
          </p>
        </div>
        <Button onClick={() => open({ kind: "new" })} primary>
          <Icon name="plus" size={15} />
          New case
        </Button>
      </header>
      <Tabs
        items={CASE_TABS}
        label="Case views"
        onChange={(caseTab) =>
          navigate({ caseTab, filters: defaultFilters(), page: 1 })
        }
        value={nav.caseTab}
      />
      <div className="toolbar">
        <div className="filters">
          <AdvisorFilter
            onChange={(advisor) => updateFilters({ advisor })}
            prefix
            value={nav.filters.advisor}
          />
          <Select
            label="Country"
            onChange={(event) =>
              updateFilters({ country: event.target.value as Country | "all" })
            }
            value={nav.filters.country}
          >
            <option value="all">Country: All</option>
            {(Object.keys(COUNTRIES) as Country[]).map((country) => (
              <option key={country} value={country}>
                {COUNTRIES[country]}
              </option>
            ))}
          </Select>
          <Button onClick={() => open({ kind: "readiness-filter" })}>
            Profile readiness
            {nav.filters.readiness.length > 0 &&
              ` (${nav.filters.readiness.length})`}
            <Icon name="chevron" size={13} />
          </Button>
          <Button onClick={() => open({ kind: "more-filters" })}>
            More filters <Icon name="plus" size={13} />
          </Button>
          <Button onClick={() => open({ kind: "save-view" })} small>
            Save view
          </Button>
          {savedViews.length > 0 && (
            <Button onClick={() => open({ kind: "saved-views" })} small>
              Saved views ({savedViews.length})
            </Button>
          )}
        </div>
        <Button onClick={() => open({ kind: "columns" })}>Columns</Button>
      </div>
      {chips.length > 0 && (
        <div className="filter-chips">
          {chips.map((chip) => (
            <button
              className="filter-chip"
              key={chip.label}
              onClick={chip.clear}
              type="button"
            >
              {chip.label}
              <Icon name="close" size={13} />
            </button>
          ))}
          <LinkButton onClick={clearFilters}>Clear filters</LinkButton>
        </div>
      )}
      <div className="tablewrap">
        <table className="case-table">
          <thead>
            <tr>
              {nav.columns.map((column) => {
                const sortable = ["person", "advisor", "deadline"].includes(
                  column
                );
                const sortKey = column === "person" ? "name" : column;
                const sorted =
                  nav.sort === sortKey || nav.sort === `${sortKey}-desc`;
                return (
                  <th
                    aria-sort={
                      sortable
                        ? sorted
                          ? nav.sort.endsWith("-desc")
                            ? "descending"
                            : "ascending"
                          : "none"
                        : undefined
                    }
                    key={column}
                    scope="col"
                  >
                    {sortable ? (
                      <button
                        className="header-button"
                        onClick={() => toggleSort(column)}
                        type="button"
                      >
                        {COLUMN_LABELS[column]}
                        {sorted && (
                          <span aria-hidden="true">
                            {nav.sort.endsWith("-desc") ? "↓" : "↑"}
                          </span>
                        )}
                      </button>
                    ) : (
                      COLUMN_LABELS[column]
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr
                className={`interactive-row ${nav.overlays.some((surface) => surface.kind === "case" && surface.caseId === record.id) ? "selected-row" : ""}`}
                data-case-id={record.id}
                key={record.id}
              >
                {nav.columns.map((column) => (
                  <td key={column}>{renderCell(record, column)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <Empty onClear={clearFilters} title="No cases match this view" />
        )}
      </div>
      <footer className="tablefoot">
        <div>
          <span>
            {filtered.length
              ? `${(page - 1) * 6 + 1}-${Math.min(page * 6, filtered.length)}`
              : "0"}{" "}
            of {filtered.length} {nav.caseTab === "active" ? "active " : ""}
            cases
          </span>
          <p className="tiny muted">Rows represent cases, not unique people</p>
        </div>
        <div className="pagination">
          <Button
            disabled={page === 1}
            onClick={() => navigate({ page: page - 1 })}
            small
          >
            <Icon name="left" size={14} />
            Previous
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button
            disabled={page >= pages}
            onClick={() => navigate({ page: page + 1 })}
            small
          >
            Next
            <Icon name="right" size={14} />
          </Button>
        </div>
        <Select
          label="Sort cases"
          onChange={(event) =>
            navigate({ sort: event.target.value as CaseSort, page: 1 })
          }
          value={nav.sort}
        >
          <option value="custom">Sort: Custom view</option>
          <option value="name">Person A-Z</option>
          <option value="name-desc">Person Z-A</option>
          <option value="deadline">Next deadline soonest</option>
          <option value="deadline-desc">Next deadline latest</option>
          <option value="advisor">Advisor A-Z</option>
          <option value="advisor-desc">Advisor Z-A</option>
        </Select>
      </footer>
    </main>
  );
}
