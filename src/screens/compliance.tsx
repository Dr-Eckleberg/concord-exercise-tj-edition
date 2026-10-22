import {
  AdvisorFilter,
  Avatar,
  Badge,
  Button,
  Count,
  Empty,
  Icon,
  LinkButton,
  Tabs,
} from "../components/ui";
import {
  ADVISORS,
  CLIENTS,
  complianceCounts,
  daysFromToday,
  formatDate,
  matchesCategory,
  OBLIGATION_TYPES,
  type Obligation,
  obligationsInScope,
  POLICY_CASES,
  TODAY,
} from "../data/workspace";
import { useWorkspace } from "../workspace-context";

export const COMPLIANCE_LABELS = {
  past: "Recorded expiry passed",
  upcoming: "Recorded expiry within 120 days",
  passport: "Passport within 6 months",
  employer: "Employer obligations",
} as const;

function VerifyRow({ item }: { item: Obligation }) {
  const { demo, open } = useWorkspace();
  const record = demo.cases.find((entry) => entry.id === item.caseId);
  if (!record) {
    return null;
  }
  return (
    <article className="workitem">
      <button
        aria-label={`Open recorded expiry for ${record.name}`}
        className="row-hitbox"
        onClick={() => open({ kind: "obligation", obligationId: item.id })}
        type="button"
      />
      <Avatar name={record.name} />
      <div className="info">
        <div className="name">
          <LinkButton
            className="name-link"
            onClick={() => open({ kind: "person", personId: record.personId })}
          >
            {record.name}
          </LinkButton>
          <Badge>
            {record.route} / {record.country}
          </Badge>
        </div>
        <p className="sub">
          {CLIENTS[item.client]} · Recorded expiry {formatDate(item.date)}
        </p>
        <div className="task">
          <Badge tone="red">Recorded expiry passed</Badge>
          {item.verification && (
            <span className="tiny muted">{item.verification.outcome}</span>
          )}
        </div>
      </div>
      <div className="due">
        <span className="muted">{ADVISORS[record.advisor]}</span>
        <Button
          onClick={() => open({ kind: "verify", obligationId: item.id })}
          small
        >
          Verify status
        </Button>
      </div>
    </article>
  );
}

export function EmployerAndPolicyRail({ items }: { items: Obligation[] }) {
  const { demo, nav, open } = useWorkspace();
  const employerItems = items.filter(
    (item) => item.type === "Employer" && !item.complete
  );
  const candidates = demo.cases.filter(
    (record) =>
      POLICY_CASES.includes(record.id) &&
      (nav.client === "all" || record.client === nav.client)
  );
  return (
    <>
      <section className="sidecard">
        <div className="sectionhead">
          <h3>Employer obligations</h3>
          <Badge>Illustrative</Badge>
        </div>
        {employerItems.map((item) => (
          <div className="deadline" key={item.id}>
            <strong>{CLIENTS[item.client].toUpperCase()}</strong>
            <LinkButton
              className="deadline-title"
              onClick={() =>
                open({ kind: "obligation", obligationId: item.id })
              }
            >
              {item.title}
            </LinkButton>
            <span className="muted tiny">
              Owner: {ADVISORS[item.advisor]} · Due {formatDate(item.date)}
            </span>
          </div>
        ))}
        {!employerItems.length && (
          <p className="tiny muted">No employer obligations in this view</p>
        )}
        <Button
          className="rail-link"
          onClick={() => open({ kind: "employer" })}
          small
        >
          View employer compliance
        </Button>
      </section>
      <section className="sidecard">
        <div className="sectionhead">
          <h3>Policy watch</h3>
          <Badge>Fictional</Badge>
        </div>
        <h4>Work visa guidance updated</h4>
        <p className="tiny muted">
          May affect {candidates.length} of 7 cases across New Zealand and
          Australia. Advisor assessment required.
        </p>
        <Button
          className="rail-link"
          onClick={() => open({ kind: "policy" })}
          primary
          small
        >
          Assess impact
        </Button>
      </section>
      <p className="notice">
        A recorded expiry is a date in the record, not a legal determination of
        current work rights.
      </p>
    </>
  );
}

function ComplianceList({ visible }: { visible: Obligation[] }) {
  const { demo, nav, navigate, open, openCase } = useWorkspace();
  const past = visible
    .filter(
      (item) => item.type === "Visa expiry" && item.date && item.date < TODAY
    )
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const upcoming = visible
    .filter(
      (item) =>
        item.date &&
        ((item.type === "Visa expiry" &&
          daysFromToday(item.date) >= 0 &&
          daysFromToday(item.date) <= 120) ||
          (item.type === "Passport" &&
            item.date >= TODAY &&
            item.date <= "2027-04-18"))
    )
    .sort(
      (a, b) =>
        (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id)
    );
  const employers = visible.filter((item) => item.type === "Employer");
  const showPast = nav.category === null || nav.category === "past";
  const showUpcoming =
    nav.category === null ||
    nav.category === "upcoming" ||
    nav.category === "passport";
  const clear = () =>
    navigate({ category: null, types: [...OBLIGATION_TYPES], advisor: "all" });
  return (
    <div className="work-layout">
      <div>
        {showPast && (
          <section className="work-group">
            <div className="sectionhead">
              <h2>
                Verify current status <Count>{past.length}</Count>
              </h2>
              <span className="tiny muted">Oldest recorded expiry first</span>
            </div>
            <div className="list">
              {past.slice(0, nav.expandedPast ? past.length : 3).map((item) => (
                <VerifyRow item={item} key={item.id} />
              ))}
              {!past.length && (
                <Empty
                  onClear={clear}
                  title="No past recorded expiries in this view"
                />
              )}
              {past.length > 3 && (
                <div className="list-footer">
                  <span className="tiny muted">
                    {!nav.expandedPast &&
                      past
                        .slice(3)
                        .map(
                          (item) =>
                            demo.cases.find(
                              (record) => record.id === item.caseId
                            )?.name
                        )
                        .join(", ")}
                  </span>
                  <LinkButton
                    onClick={() =>
                      navigate({ expandedPast: !nav.expandedPast })
                    }
                  >
                    {nav.expandedPast
                      ? "Show fewer"
                      : `Show ${past.length - 3} more`}
                  </LinkButton>
                </div>
              )}
            </div>
          </section>
        )}
        {showUpcoming && (
          <section className="work-group">
            <div className="sectionhead">
              <h2>
                Upcoming dates <Count>{upcoming.length}</Count>
              </h2>
              <span className="tiny muted">Soonest first</span>
            </div>
            <div className="tablewrap">
              <table className="upcoming-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Person / client</th>
                    <th scope="col">Obligation</th>
                    <th scope="col">Status</th>
                    <th scope="col">Next step</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((item) => {
                    const record = demo.cases.find(
                      (entry) => entry.id === item.caseId
                    );
                    if (!record) {
                      return null;
                    }
                    return (
                      <tr className="interactive-row" key={item.id}>
                        <td>
                          <button
                            className="case-row-opener"
                            onClick={() =>
                              open({
                                kind: "obligation",
                                obligationId: item.id,
                              })
                            }
                            type="button"
                          >
                            {formatDate(item.date)}
                          </button>
                          <p className="sub">
                            {item.date && daysFromToday(item.date)} days
                          </p>
                        </td>
                        <td>
                          <LinkButton
                            className="name-link above-row"
                            onClick={() =>
                              open({
                                kind: "person",
                                personId: record.personId,
                              })
                            }
                          >
                            {record.name}
                          </LinkButton>
                          <p className="sub">
                            {CLIENTS[item.client]} · {record.route}
                          </p>
                        </td>
                        <td>{item.title}</td>
                        <td>
                          <Badge
                            tone={
                              record.id === "C02" || item.type === "Passport"
                                ? "amber"
                                : "gray"
                            }
                          >
                            {record.id === "C02"
                              ? "Active case open"
                              : item.type === "Passport"
                                ? "Renewal plan needed"
                                : "No renewal case"}
                          </Badge>
                          {record.id === "C02" && (
                            <p className="sub">Evidence requested</p>
                          )}
                        </td>
                        <td>
                          {record.id === "C02" ? (
                            <LinkButton
                              className="above-row"
                              onClick={() => openCase(record.id, "evidence")}
                            >
                              Open case
                            </LinkButton>
                          ) : item.type === "Passport" ? (
                            <LinkButton
                              className="above-row"
                              onClick={() =>
                                open({
                                  kind: "compose",
                                  caseId: record.id,
                                  section: "personal",
                                  text: "Please share your passport renewal plans and provide updated information when available.",
                                })
                              }
                            >
                              Message client
                            </LinkButton>
                          ) : (
                            <LinkButton
                              className="above-row"
                              onClick={() =>
                                open({ kind: "new", renewalCaseId: record.id })
                              }
                            >
                              Plan renewal
                            </LinkButton>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!upcoming.length && (
                <Empty
                  onClear={clear}
                  title="No upcoming recorded dates in this view"
                />
              )}
            </div>
          </section>
        )}
        {nav.category === "employer" && (
          <section className="work-group">
            <div className="sectionhead">
              <h2>
                Employer planning checks <Count>{employers.length}</Count>
              </h2>
            </div>
            <div className="list">
              {employers.map((item) => (
                <div className="simple-row" key={item.id}>
                  <div>
                    <LinkButton
                      onClick={() =>
                        open({ kind: "obligation", obligationId: item.id })
                      }
                    >
                      {item.title}
                    </LinkButton>
                    <p className="sub">
                      {CLIENTS[item.client]} · {ADVISORS[item.advisor]}
                    </p>
                  </div>
                  <span className="tiny">{formatDate(item.date)}</span>
                </div>
              ))}
              {!employers.length && (
                <Empty
                  onClear={clear}
                  title="No employer obligations in this view"
                />
              )}
            </div>
          </section>
        )}
      </div>
      <aside className="right-rail">
        <EmployerAndPolicyRail items={visible} />
      </aside>
    </div>
  );
}

function shiftMonth(month: string, amount: number): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + amount, 1))
    .toISOString()
    .slice(0, 7);
}

function ComplianceCalendar({
  visible,
  scoped,
}: {
  visible: Obligation[];
  scoped: Obligation[];
}) {
  const { demo, nav, navigate, open, openCase } = useWorkspace();
  const [year, month] = nav.month.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((offset + length) / 7) * 7;
  const hidden = scoped.filter(
    (item) => !visible.some((entry) => entry.id === item.id)
  );
  const undated = visible.filter((item) => !item.date);
  const past = visible.filter(
    (item) => item.type === "Visa expiry" && item.date && item.date < TODAY
  );
  const title = new Intl.DateTimeFormat("en-NZ", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(first);
  return (
    <div className="work-layout calendar-layout">
      <section className="calendar-card">
        <div className="calendar-toolbar">
          <h2>{title}</h2>
          <div className="button-row">
            <Button
              aria-label="Previous month"
              onClick={() => navigate({ month: shiftMonth(nav.month, -1) })}
              small
            >
              <Icon name="left" size={16} />
            </Button>
            <Button onClick={() => navigate({ month: "2026-10" })} small>
              Today
            </Button>
            <Button
              aria-label="Next month"
              onClick={() => navigate({ month: shiftMonth(nav.month, 1) })}
              small
            >
              <Icon name="right" size={16} />
            </Button>
          </div>
        </div>
        <div className="calendar-weekdays">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <section aria-label={title} className="calendar-grid">
          {Array.from({ length: cellCount }, (_, index) => {
            const day = index - offset + 1;
            if (day < 1 || day > length) {
              return (
                <div
                  aria-hidden="true"
                  className="calendar-day outside-month"
                  key={`empty-${nav.month}-${day}`}
                />
              );
            }
            const date = `${nav.month}-${String(day).padStart(2, "0")}`;
            const events = visible.filter((item) => item.date === date);
            return (
              <div
                className={`calendar-day ${date === TODAY ? "today" : ""} ${date === nav.selectedDay ? "selected-day" : ""}`}
                key={date}
              >
                <button
                  aria-label={`View obligations for ${formatDate(date)}`}
                  className="day-number"
                  onClick={() => {
                    navigate({ selectedDay: date });
                    open({ kind: "day", date });
                  }}
                  type="button"
                >
                  {day}
                </button>
                {events.slice(0, 2).map((item) => (
                  <button
                    className={`calendar-event event-${item.type.toLowerCase().replaceAll(" ", "-")}`}
                    key={item.id}
                    onClick={() =>
                      open({ kind: "obligation", obligationId: item.id })
                    }
                    title={`${item.title} · ${demo.cases.find((record) => record.id === item.caseId)?.name ?? CLIENTS[item.client]}`}
                    type="button"
                  >
                    <span>{item.type}</span>
                    {item.title}
                  </button>
                ))}
                {events.length > 2 && (
                  <LinkButton
                    className="more-events"
                    onClick={() => open({ kind: "day", date })}
                  >
                    +{events.length - 2} more
                  </LinkButton>
                )}
              </div>
            );
          })}
        </section>
      </section>
      <aside className="right-rail">
        <section className="sidecard">
          <h3>
            Undated tasks <Count>{undated.length}</Count>
          </h3>
          {undated.map((item) => (
            <div className="deadline" key={item.id}>
              <LinkButton
                className="deadline-title"
                onClick={() =>
                  item.caseId
                    ? openCase(
                        item.caseId,
                        item.type === "Government" ? "evidence" : "overview"
                      )
                    : open({ kind: "obligation", obligationId: item.id })
                }
              >
                {item.title}
              </LinkButton>
              <span className="sub">
                {item.caseId} · {item.type}
              </span>
            </div>
          ))}
          {!undated.length && (
            <p className="tiny muted">No undated tasks in this view</p>
          )}
        </section>
        <section className="sidecard">
          <h3>
            Past records to verify <Count>{past.length}</Count>
          </h3>
          {past.map((item) => (
            <div className="compact-deadline" key={item.id}>
              <LinkButton
                onClick={() => open({ kind: "verify", obligationId: item.id })}
              >
                {demo.cases.find((record) => record.id === item.caseId)?.name}
              </LinkButton>
              <span className="sub">{formatDate(item.date)}</span>
            </div>
          ))}
          {!past.length && (
            <p className="tiny muted">No past records in this view</p>
          )}
        </section>
        {hidden.length > 0 && (
          <details className="sidecard hidden-events">
            <summary>Hidden by filters ({hidden.length})</summary>
            {hidden.map((item) => (
              <div className="compact-deadline" key={item.id}>
                <LinkButton
                  onClick={() =>
                    open({ kind: "obligation", obligationId: item.id })
                  }
                >
                  {item.title} · {item.caseId ?? CLIENTS[item.client]}
                </LinkButton>
                <span className="sub">
                  {formatDate(item.date)} · {item.type}
                </span>
              </div>
            ))}
          </details>
        )}
      </aside>
    </div>
  );
}

export function Compliance() {
  const { demo, nav, navigate } = useWorkspace();
  const scoped = obligationsInScope(demo, nav.client, nav.advisor).filter(
    (item) => !item.complete
  );
  const metrics = complianceCounts(scoped);
  const visible = scoped.filter(
    (item) =>
      nav.types.includes(item.type) && matchesCategory(item, nav.category)
  );
  return (
    <main className="content">
      <header className="heading">
        <div>
          <h1>Compliance</h1>
          <p>
            Recorded dates that need verification, renewal planning, or advisor
            review.
          </p>
          <span className="mobile-as-of">As of 18 Oct 2026</span>
        </div>
        <div className="heading-actions">
          <AdvisorFilter
            onChange={(advisor) => navigate({ advisor })}
            value={nav.advisor}
          />
          <Tabs
            items={[
              { value: "list", label: "List" },
              { value: "calendar", label: "Calendar" },
            ]}
            label="Compliance display"
            onChange={(complianceMode) => navigate({ complianceMode })}
            value={nav.complianceMode}
          />
        </div>
      </header>
      <section aria-label="Compliance summary" className="summary-strip">
        {(
          Object.keys(COMPLIANCE_LABELS) as (keyof typeof COMPLIANCE_LABELS)[]
        ).map((category) => (
          <button
            aria-pressed={nav.category === category}
            className={`metric ${category === "past" ? "red" : ""} ${nav.category === category ? "selected" : ""}`}
            key={category}
            onClick={() =>
              navigate({
                category: nav.category === category ? null : category,
              })
            }
            type="button"
          >
            <strong>{metrics[category]}</strong>
            <span>{COMPLIANCE_LABELS[category]}</span>
          </button>
        ))}
      </section>
      {nav.category && (
        <div className="filter-chips">
          <button
            className="filter-chip"
            onClick={() => navigate({ category: null })}
            type="button"
          >
            {COMPLIANCE_LABELS[nav.category]}
            <Icon name="close" size={13} />
          </button>
          <LinkButton onClick={() => navigate({ category: null })}>
            Clear category
          </LinkButton>
        </div>
      )}
      <fieldset className="type-filters">
        <legend>Date types</legend>
        {OBLIGATION_TYPES.map((type) => (
          <label
            className={`type-chip ${nav.types.includes(type) ? "checked" : ""}`}
            key={type}
          >
            <input
              checked={nav.types.includes(type)}
              onChange={(event) =>
                navigate({
                  types: event.target.checked
                    ? [...nav.types, type]
                    : nav.types.filter((value) => value !== type),
                })
              }
              type="checkbox"
            />
            {type}
          </label>
        ))}
      </fieldset>
      {nav.complianceMode === "list" ? (
        <ComplianceList visible={visible} />
      ) : (
        <ComplianceCalendar scoped={scoped} visible={visible} />
      )}
    </main>
  );
}
