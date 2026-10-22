import {
  AdvisorFilter,
  Avatar,
  Badge,
  Button,
  Count,
  Empty,
  Icon,
  LinkButton,
  Select,
} from "../components/ui";
import {
  type CaseRecord,
  CLIENTS,
  changedSections,
  type DemoRequest,
  daysFromToday,
  formatDate,
  type Obligation,
  obligationsInScope,
  type Queue,
  queueCases,
  requestsFor,
} from "../data/workspace";
import { defaultFilters, useWorkspace } from "../workspace-context";

export const QUEUE_LABELS: Record<Queue, string> = {
  urgent: "Urgent casework",
  review: "Profiles to review",
  waiting: "Waiting on clients",
  ready: "Ready for casework",
};
const GROUP_LABELS: Record<Queue, string> = {
  urgent: "Needs attention",
  review: "Ready for review",
  waiting: "Waiting on clients",
  ready: "Ready for casework",
};
const AVATAR_TINTS: Record<string, string> = {
  C02: "peach",
  C07: "lavender",
  C08: "sand",
};

function followUpLabel(request: DemoRequest | undefined): string {
  if (!request?.followUp) {
    return "Follow-up not recorded";
  }
  return daysFromToday(request.followUp) <= 0
    ? "Follow up today"
    : `Follow up ${formatDate(request.followUp)}`;
}

function workCopy(
  record: CaseRecord,
  queue: Queue,
  changes: number,
  request: DemoRequest | undefined,
  urgent: Obligation | undefined
): { task: string; meta: string; action: string } {
  if (queue === "urgent") {
    if (record.id === "C07") {
      return {
        task: "Internal review needs a next step",
        meta: "Next action not set",
        action: "Review case",
      };
    }
    return {
      task: urgent?.date ? "Prepare evidence response" : "Evidence requested",
      meta: urgent?.date
        ? `Due ${formatDate(urgent.date)}`
        : "Confirm response date",
      action: "Review request",
    };
  }
  if (queue === "review") {
    return {
      task: changes ? "Client updates received" : "First review",
      meta: `${record.supplied}% information supplied`,
      action: "Review profile",
    };
  }
  if (queue === "waiting") {
    return {
      task: request?.body ?? "Awaiting client information",
      meta: followUpLabel(request),
      action: "Review & remind",
    };
  }
  return {
    task: "Begin application preparation",
    meta: "Profile approved to proceed",
    action: "Open case",
  };
}

function WorkRow({ record, queue }: { record: CaseRecord; queue: Queue }) {
  const { demo, open, openCase, openReview } = useWorkspace();
  const request = requestsFor(demo, record.id)
    .filter((item) => item.status !== "Resolved")
    .sort((a, b) => a.followUp.localeCompare(b.followUp))[0];
  const urgent = demo.obligations.find(
    (item) => item.caseId === record.id && item.urgent && !item.complete
  );
  const changes = changedSections(record).length;
  const submittedDays = -daysFromToday(record.submitted);
  const submitted =
    submittedDays === 0
      ? "Submitted today"
      : `Submitted ${submittedDays} ${submittedDays === 1 ? "day" : "days"} ago`;
  const { task, meta, action } = workCopy(
    record,
    queue,
    changes,
    request,
    urgent
  );
  const run = () => {
    if (queue === "review") {
      openReview(record);
    } else if (queue === "waiting" && request) {
      open({ kind: "conversation", requestId: request.id, remind: true });
    } else {
      openCase(
        record.id,
        queue === "urgent" && record.id === "C02" ? "evidence" : "overview"
      );
    }
  };
  return (
    <article className="workitem">
      <button
        aria-label={`Open case ${record.id} for ${record.name}`}
        className="row-hitbox"
        onClick={() => openCase(record.id)}
        type="button"
      />
      <Avatar name={record.name} tint={AVATAR_TINTS[record.id]} />
      <div className="info">
        <div className="name">
          <LinkButton className="name-link" onClick={() => openCase(record.id)}>
            {record.name}
          </LinkButton>
          {queue !== "waiting" && (
            <Badge>
              {record.route} / {record.country}
            </Badge>
          )}
        </div>
        <div className="sub">
          {CLIENTS[record.client]}
          {queue === "review"
            ? ` · ${submitted}`
            : queue === "waiting"
              ? ` · ${record.route} / ${record.country}`
              : ""}
        </div>
        <div className="task">
          {queue === "review" ? (
            <>
              <Badge tone={changes ? "blue" : "amber"}>{task}</Badge>
              {changes > 0 && (
                <span className="muted tiny">{changes} sections changed</span>
              )}
            </>
          ) : (
            <span>{task}</span>
          )}
          {queue === "urgent" && record.id === "C02" && !urgent?.date && (
            <Badge tone="red">Deadline missing</Badge>
          )}
        </div>
      </div>
      <div className="due">
        {queue === "waiting" ? (
          <Badge tone="amber">{meta}</Badge>
        ) : (
          <span className="muted">{meta}</span>
        )}
        <Button
          onClick={run}
          primary={queue === "review" && record.id === "C01"}
          small
        >
          {action}
        </Button>
      </div>
    </article>
  );
}

export function MyWork() {
  const { demo, nav, navigate, open } = useWorkspace();
  const queues = {
    urgent: queueCases(demo, "urgent", nav.client, nav.advisor),
    review: queueCases(demo, "review", nav.client, nav.advisor).sort((a, b) => {
      const order = a.submitted.localeCompare(b.submitted);
      return (
        (nav.reviewSort === "oldest" ? order : -order) ||
        a.id.localeCompare(b.id)
      );
    }),
    waiting: queueCases(demo, "waiting", nav.client, nav.advisor).sort(
      (a, b) => {
        const first =
          requestsFor(demo, a.id).find((item) => item.status === "Open")
            ?.followUp ?? "";
        const second =
          requestsFor(demo, b.id).find((item) => item.status === "Open")
            ?.followUp ?? "";
        return first.localeCompare(second) || a.id.localeCompare(b.id);
      }
    ),
    ready: queueCases(demo, "ready", nav.client, nav.advisor),
  };
  const comingUp = obligationsInScope(demo, nav.client, nav.advisor)
    .filter(
      (item) =>
        !(item.complete || item.requestId) &&
        item.date &&
        daysFromToday(item.date) >= 0 &&
        daysFromToday(item.date) <= 7 &&
        ["Internal", "Follow-up", "Employer"].includes(item.type)
    )
    .sort(
      (a, b) =>
        (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id)
    )
    .slice(0, 3);
  const groups: Queue[] = nav.queue
    ? [nav.queue]
    : ["urgent", "review", "waiting"];
  return (
    <main className="content">
      <header className="heading">
        <div>
          <h1>Make the next move.</h1>
          <p>Your team&apos;s actions, reviews, and follow-ups in one place.</p>
        </div>
        <AdvisorFilter
          onChange={(advisor) => navigate({ advisor })}
          value={nav.advisor}
        />
      </header>
      <section aria-label="Work queues" className="summary-strip">
        {(Object.keys(QUEUE_LABELS) as Queue[]).map((queue) => (
          <button
            aria-pressed={nav.queue === queue}
            className={`metric ${queue === "urgent" ? "red" : ""} ${nav.queue === queue ? "selected" : ""}`}
            key={queue}
            onClick={() =>
              navigate({ queue: nav.queue === queue ? null : queue })
            }
            type="button"
          >
            <strong>{queues[queue].length}</strong>
            <span>{QUEUE_LABELS[queue]}</span>
          </button>
        ))}
      </section>
      {nav.queue && (
        <div className="filter-chips">
          <button
            className="filter-chip"
            onClick={() => navigate({ queue: null })}
            type="button"
          >
            {QUEUE_LABELS[nav.queue]}
            <Icon name="close" size={13} />
          </button>
          <LinkButton onClick={() => navigate({ queue: null })}>
            Clear queue
          </LinkButton>
        </div>
      )}
      <div className="work-layout">
        <div>
          {groups.map((queue) => {
            const all = queues[queue];
            const visible = nav.queue
              ? all
              : all.slice(
                  0,
                  queue === "review" ? 2 : queue === "waiting" ? 1 : all.length
                );
            return (
              <section className="work-group" key={queue}>
                <div className="sectionhead">
                  <h2>
                    {GROUP_LABELS[queue]} <Count>{all.length}</Count>
                  </h2>
                  {queue === "urgent" && !nav.queue && (
                    <LinkButton onClick={() => navigate({ queue: "urgent" })}>
                      View all actions
                    </LinkButton>
                  )}
                  {queue === "review" && (
                    <div className="section-controls">
                      {nav.queue ? (
                        <LinkButton onClick={() => navigate({ queue: null })}>
                          Show fewer
                        </LinkButton>
                      ) : (
                        <span className="tiny muted">
                          Showing {visible.length} of {all.length}
                          {all.length > 2 && (
                            <>
                              {" "}
                              ·{" "}
                              <LinkButton
                                onClick={() => navigate({ queue: "review" })}
                              >
                                Show all
                              </LinkButton>
                            </>
                          )}
                        </span>
                      )}
                      <Select
                        label="Review submission order"
                        onChange={(event) =>
                          navigate({
                            reviewSort: event.target.value as
                              | "oldest"
                              | "newest",
                          })
                        }
                        value={nav.reviewSort}
                      >
                        <option value="oldest">Oldest first</option>
                        <option value="newest">Newest first</option>
                      </Select>
                    </div>
                  )}
                  {queue === "waiting" && !nav.queue && (
                    <LinkButton onClick={() => navigate({ queue: "waiting" })}>
                      See outstanding requests
                    </LinkButton>
                  )}
                </div>
                <div className="list">
                  {visible.map((record) => (
                    <WorkRow key={record.id} queue={queue} record={record} />
                  ))}
                  {!visible.length && (
                    <Empty
                      onClear={() =>
                        navigate({ client: "all", advisor: "all", queue: null })
                      }
                      title={`No ${QUEUE_LABELS[queue].toLowerCase()} items in this view`}
                    />
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <aside className="right-rail">
          <section className="sidecard">
            <h3>Coming up</h3>
            <p className="tiny muted rail-intro">Illustrative planning dates</p>
            {comingUp.map((item) => {
              const record = demo.cases.find(
                (entry) => entry.id === item.caseId
              );
              const date = new Date(`${item.date}T00:00:00Z`);
              const weekday = new Intl.DateTimeFormat("en-NZ", {
                weekday: "short",
                timeZone: "UTC",
              }).format(date);
              return (
                <div className="deadline" key={item.id}>
                  <strong>
                    {weekday.toUpperCase()}{" "}
                    {formatDate(item.date).replace(" 2026", "").toUpperCase()}
                  </strong>
                  <LinkButton
                    className="deadline-title"
                    onClick={() =>
                      open({ kind: "obligation", obligationId: item.id })
                    }
                  >
                    {item.title}
                  </LinkButton>
                  <span className="muted tiny">
                    {record
                      ? `${record.name} · ${record.route}`
                      : CLIENTS[item.client]}
                  </span>
                </div>
              );
            })}
            {!comingUp.length && (
              <p className="tiny muted">No upcoming planning items</p>
            )}
            <LinkButton
              className="rail-link"
              onClick={() =>
                navigate({
                  screen: "compliance",
                  complianceMode: "calendar",
                  month: "2026-10",
                  category: null,
                  types: [
                    "Government",
                    "Internal",
                    "Follow-up",
                    "Employer",
                    "Visa expiry",
                    "Passport",
                  ],
                })
              }
            >
              Open deadline planner <Icon name="right" size={14} />
            </LinkButton>
          </section>
          <section className="sidecard">
            <h3>Ready to move forward</h3>
            <p className="tiny muted">
              {queues.ready.length}{" "}
              {queues.ready.length === 1 ? "profile has" : "profiles have"}{" "}
              advisor approval. Begin preparation of their applications.
            </p>
            <Button
              className="rail-link"
              onClick={() =>
                navigate({
                  screen: "cases",
                  caseTab: "ready",
                  filters: defaultFilters(),
                  page: 1,
                })
              }
              small
            >
              View ready cases
            </Button>
          </section>
          <p className="notice">
            Record checks are separate from urgent casework.
          </p>
        </aside>
      </div>
    </main>
  );
}
