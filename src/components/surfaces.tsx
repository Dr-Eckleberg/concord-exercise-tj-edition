import { useRef, useState } from "react";
import {
  ADVISORS,
  approvalBlockers,
  type CaseRecord,
  CLIENTS,
  type ClientId,
  COUNTRIES,
  emailFor,
  formatDate,
  type HistoryCategory,
  matchesCategory,
  nextAction,
  type Obligation,
  obligationsInScope,
  POLICY_CASES,
  POLICY_ID,
  REVIEW_LABELS,
  type ReviewCode,
  requestsFor,
  reviewCode,
  SECTIONS,
  sectionIds,
} from "../data/workspace";
import {
  type CasePanelTab,
  COLUMN_LABELS,
  type Column,
  DEFAULT_COLUMNS,
  DirtyScope,
  defaultFilters,
  type Surface,
  useWorkspace,
} from "../workspace-context";
import { ClientMessageForm, WorkflowForm } from "./forms";
import {
  Avatar,
  Badge,
  Button,
  Count,
  Empty,
  Icon,
  LinkButton,
  Overlay,
  ReviewBadge,
  Select,
  Tabs,
} from "./ui";

type HistoryFilter = "All" | HistoryCategory;
function HistoryList({
  caseId,
  filter,
  setFilter,
}: {
  caseId: string;
  filter: HistoryFilter;
  setFilter: (filter: HistoryFilter) => void;
}) {
  const { demo } = useWorkspace();
  const entries = demo.history
    .filter(
      (entry) =>
        entry.caseId === caseId &&
        (filter === "All" || entry.category === filter)
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order);
  return (
    <>
      <p className="helper">
        Internal workspace history, not a client portal. Messages explicitly
        marked client-visible remain local simulations.
      </p>
      <Tabs
        items={["All", "Profile", "Tasks", "Communication"].map((value) => ({
          value: value as HistoryFilter,
          label: value,
        }))}
        label="History filter"
        onChange={setFilter}
        value={filter}
      />
      <div className="history-list">
        {entries.map((entry) => (
          <article className="history-entry" key={entry.id}>
            <div className="sectionhead">
              <strong>{entry.title}</strong>
              <Badge tone={entry.visibility === "Internal" ? "gray" : "blue"}>
                {entry.visibility}
              </Badge>
            </div>
            <p>{entry.detail}</p>
            <p className="sub">
              {formatDate(entry.date)} · Event {entry.order} · {entry.category}
            </p>
          </article>
        ))}
        {!entries.length && (
          <Empty title="No history in this category">
            <LinkButton onClick={() => setFilter("All")}>
              Clear filter
            </LinkButton>
          </Empty>
        )}
      </div>
    </>
  );
}

function HistoryDialog({ caseId }: { caseId: string }) {
  const [filter, setFilter] = useState<HistoryFilter>("All");
  return <HistoryList caseId={caseId} filter={filter} setFilter={setFilter} />;
}

function CaseOverview({ record }: { record: CaseRecord }) {
  const { demo, open, openReview } = useWorkspace();
  const action = nextAction(demo, record);
  const obligations = demo.obligations.filter(
    (item) => item.caseId === record.id && !item.complete && item.date
  );
  const actionId =
    demo.obligations.find(
      (item) => item.id === record.actionTaskId && !item.complete
    )?.id ??
    demo.obligations.find(
      (item) =>
        item.caseId === record.id &&
        item.urgent &&
        item.type !== "Government" &&
        !item.complete
    )?.id;
  return (
    <>
      <div className="case-signals">
        <div>
          <span className="label">Profile readiness</span>
          <ReviewBadge code={reviewCode(demo, record)} />
          <p className="sub">{record.supplied}% information supplied</p>
        </div>
        <div>
          <span className="label">Application stage</span>
          <strong>{record.stage}</strong>
          <p className="sub">
            {record.closed ? "Case closed" : "Active case"}
            {record.preparation ? " · Preparation started" : ""}
          </p>
        </div>
      </div>
      {record.approval && (
        <p className="notice">
          Profile v{record.approval.version} approved by {record.approval.actor}{" "}
          on {formatDate(record.approval.date)}. This is not government
          approval.
        </p>
      )}
      <div className="button-row">
        <Button onClick={() => openReview(record)} primary>
          Review profile
        </Button>
        <Button
          onClick={() => open({ kind: "person", personId: record.personId })}
        >
          Person details
        </Button>
      </div>
      <section className="detail-section">
        <h3>Next action</h3>
        <p>{action.title}</p>
        <p className="sub">
          Waiting on: {action.owner} · {action.detail}
        </p>
        <Button
          className="rail-link"
          onClick={() =>
            open({ kind: "action", caseId: record.id, taskId: actionId })
          }
          small
        >
          Set next action
        </Button>
      </section>
      <section className="detail-section">
        <div className="sectionhead">
          <div>
            <h3>Assigned advisor</h3>
            <p>{ADVISORS[record.advisor]}</p>
          </div>
          <Button
            onClick={() => open({ kind: "assign", caseId: record.id })}
            small
          >
            Assign advisor
          </Button>
        </div>
      </section>
      {record.approval && record.stage === "Not filed" && (
        <section className="detail-section">
          <h3>Application preparation</h3>
          <p className="tiny muted">
            Profile approval, preparation, and filing are separate states.
          </p>
          <Button
            className="rail-link"
            onClick={() => open({ kind: "preparation", caseId: record.id })}
            primary={!record.preparation}
            small
          >
            {record.preparation ? "Preparation started" : "Begin preparation"}
          </Button>
        </section>
      )}
      <section className="detail-section">
        <h3>Recorded dates & deadlines</h3>
        {obligations.map((item) => (
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
                {item.type === "Visa expiry"
                  ? "Recorded expiry"
                  : item.type === "Employer"
                    ? "Internal planning"
                    : item.type}
              </p>
            </div>
            <span className="tiny">{formatDate(item.date)}</span>
          </div>
        ))}
        {!obligations.length && <p className="tiny muted">Not recorded</p>}
      </section>
    </>
  );
}

function CaseTasks({ record }: { record: CaseRecord }) {
  const { demo, open } = useWorkspace();
  const tasks = demo.obligations.filter(
    (item) =>
      item.caseId === record.id &&
      !["Visa expiry", "Passport"].includes(item.type)
  );
  const requests = requestsFor(demo, record.id);
  return (
    <>
      <h3 className="subheading">Tasks</h3>
      {tasks.map((item) => (
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
              {item.type} · {formatDate(item.date)} · {item.owner}
            </p>
          </div>
          <Badge tone={item.complete ? "green" : "amber"}>
            {item.complete ? "Complete" : "Open"}
          </Badge>
        </div>
      ))}
      {!tasks.length && <p className="muted tiny">No tasks recorded</p>}
      <h3 className="subheading">Client-visible requests</h3>
      {requests.map((request) => (
        <article className="request-detail" key={request.id}>
          <div className="sectionhead">
            <strong>{SECTIONS[request.section]}</strong>
            <Badge
              tone={
                request.status === "Resolved"
                  ? "green"
                  : request.status === "Client replied"
                    ? "blue"
                    : "amber"
              }
            >
              {request.status}
            </Badge>
          </div>
          <p>{request.body}</p>
          <p className="sub">Follow-up {formatDate(request.followUp)}</p>
          <Button
            className="rail-link"
            onClick={() =>
              open({ kind: "conversation", requestId: request.id })
            }
            small
          >
            View conversation
          </Button>
        </article>
      ))}
      {!requests.length && <p className="muted tiny">No requests recorded</p>}
    </>
  );
}

function EvidenceResponse({ record }: { record: CaseRecord }) {
  const { demo, open, change } = useWorkspace();
  const task = demo.obligations.find(
    (item) => item.caseId === record.id && item.type === "Government"
  );
  return (
    <>
      <Badge tone="amber">Evidence requested</Badge>
      <h3 className="subheading">Evidence response</h3>
      <p>
        This fictional request asks the advisor to prepare additional supporting
        evidence. Confirm the response date from the illustrative notice before
        planning the response.
      </p>
      <dl className="detail-list">
        <div>
          <dt>Government response deadline</dt>
          <dd>{formatDate(task?.date)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{task?.date ? task.source : "Not recorded"}</dd>
        </div>
        <div>
          <dt>Response task</dt>
          <dd>{task?.complete ? "Complete in demo" : "Open"}</dd>
        </div>
      </dl>
      <div className="button-row">
        <Button
          onClick={() => open({ kind: "deadline", caseId: record.id })}
          primary
        >
          {task?.date ? "Edit response deadline" : "Record deadline"}
        </Button>
        {task &&
          (task.complete ? (
            <Button
              onClick={() =>
                change(
                  { type: "complete", obligationId: task.id, complete: false },
                  "Response task reopened in demo."
                )
              }
            >
              Reopen task
            </Button>
          ) : (
            <Button
              onClick={() => open({ kind: "complete", obligationId: task.id })}
            >
              Mark complete
            </Button>
          ))}
      </div>
      <p className="helper">
        Completing the response task does not change the government application
        stage.
      </p>
    </>
  );
}

function CasePanel({
  surface,
}: {
  surface: Extract<Surface, { kind: "case" }>;
}) {
  const { demo, replaceSurface } = useWorkspace();
  const [filter, setFilter] = useState<HistoryFilter>("All");
  const record = demo.cases.find((item) => item.id === surface.caseId);
  if (!record) {
    return <Empty title="This demo case was not found" />;
  }
  const tabs: { value: CasePanelTab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "tasks", label: "Tasks & requests" },
    { value: "history", label: "History" },
    ...(record.id === "C02"
      ? [{ value: "evidence" as const, label: "Evidence response" }]
      : []),
  ];
  return (
    <>
      <div className="case-context">
        <Badge>{record.id}</Badge>
        <span>{CLIENTS[record.client]}</span>
        <p>
          {record.route} / {COUNTRIES[record.country]}
          {record.closed ? " · Closed" : ""}
        </p>
      </div>
      <Tabs
        items={tabs}
        label="Case details"
        onChange={(tab) => replaceSurface({ ...surface, tab })}
        value={surface.tab}
      />
      <div className={surface.tab === "overview" ? "" : "hidden-panel"}>
        <CaseOverview record={record} />
      </div>
      <div className={surface.tab === "tasks" ? "" : "hidden-panel"}>
        <CaseTasks record={record} />
      </div>
      <div className={surface.tab === "history" ? "" : "hidden-panel"}>
        <HistoryList caseId={record.id} filter={filter} setFilter={setFilter} />
      </div>
      {record.id === "C02" && (
        <div className={surface.tab === "evidence" ? "" : "hidden-panel"}>
          <EvidenceResponse record={record} />
        </div>
      )}
    </>
  );
}

function CaseLinks({ records }: { records: CaseRecord[] }) {
  const { openCase } = useWorkspace();
  return (
    <div className="linked-cases">
      {records.map((record) => (
        <div className="simple-row" key={record.id}>
          <div>
            <LinkButton onClick={() => openCase(record.id)}>
              {record.id} · {record.name}
            </LinkButton>
            <p className="sub">
              {record.route} / {COUNTRIES[record.country]} · {record.stage}
              {record.closed ? " · Closed" : ""}
            </p>
          </div>
          <Button onClick={() => openCase(record.id)} small>
            Open case
          </Button>
        </div>
      ))}
    </div>
  );
}

function PeopleDirectory() {
  const { demo, nav, open } = useWorkspace();
  const [query, setQuery] = useState("");
  const scoped = demo.cases.filter(
    (record) => nav.client === "all" || record.client === nav.client
  );
  const people = [
    ...new Map(scoped.map((record) => [record.personId, record])).values(),
  ];
  const filtered = people.filter((record) =>
    `${record.name} ${CLIENTS[record.client]}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  return (
    <>
      <div className="panel-search">
        <label className="sr-only" htmlFor="people-query">
          Search people
        </label>
        <input
          id="people-query"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people"
          type="search"
          value={query}
        />
        <LinkButton onClick={() => setQuery("")}>Clear</LinkButton>
      </div>
      <p className="helper">
        {people.length} people · {scoped.length} cases · Current client scope
      </p>
      {filtered.map((record) => (
        <button
          className="directory-row"
          key={record.personId}
          onClick={() => open({ kind: "person", personId: record.personId })}
          type="button"
        >
          <Avatar name={record.name} />
          <div>
            <strong>{record.name}</strong>
            <p className="sub">{CLIENTS[record.client]}</p>
          </div>
          <span className="tiny muted">
            {scoped.filter((item) => item.personId === record.personId).length}{" "}
            cases
          </span>
          <Icon name="right" size={15} />
        </button>
      ))}
      {!filtered.length && (
        <Empty title="No people match this search">
          <LinkButton onClick={() => setQuery("")}>Clear search</LinkButton>
        </Empty>
      )}
    </>
  );
}

function PersonDetail({ personId }: { personId: string }) {
  const { demo, open, replaceSurface } = useWorkspace();
  const records = demo.cases.filter((record) => record.personId === personId);
  const record = records[0];
  if (!record) {
    return <Empty title="This person was not found" />;
  }
  const dates = demo.obligations.filter(
    (item) =>
      records.some((entry) => entry.id === item.caseId) &&
      ["Visa expiry", "Passport"].includes(item.type)
  );
  return (
    <>
      <LinkButton
        className="back-link"
        onClick={() => replaceSurface({ kind: "people" })}
      >
        <Icon name="left" size={14} />
        Back to people
      </LinkButton>
      <div className="personhead">
        <Avatar large name={record.name} />
        <div>
          <h3>{record.name}</h3>
          <p className="sub">{CLIENTS[record.client]}</p>
        </div>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Contact</dt>
          <dd>{emailFor(record)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{COUNTRIES[record.country]}</dd>
        </div>
        <div>
          <dt>Other personal details</dt>
          <dd>Illustrative detail</dd>
        </div>
      </dl>
      <section className="detail-section">
        <h3>Current permissions (illustrative)</h3>
        <p className="tiny muted">
          Route information is recorded for this fictional person. These records
          do not establish current permission or work rights.
        </p>
      </section>
      <section className="detail-section">
        <h3>Recorded expiry / passport</h3>
        {dates.length ? (
          dates.map((item) => (
            <div className="simple-row" key={item.id}>
              <LinkButton
                onClick={() =>
                  open({ kind: "obligation", obligationId: item.id })
                }
              >
                {item.title} · {item.caseId}
              </LinkButton>
              <span className="tiny">{formatDate(item.date)}</span>
            </div>
          ))
        ) : (
          <p className="tiny muted">Not recorded</p>
        )}
      </section>
      <h3 className="subheading">
        Linked cases <Count>{records.length}</Count>
      </h3>
      <CaseLinks records={records} />
    </>
  );
}

function ClientsDirectory() {
  const { demo, nav, open } = useWorkspace();
  const [query, setQuery] = useState("");
  const clients = (Object.keys(CLIENTS) as ClientId[]).filter(
    (id) =>
      (nav.client === "all" || id === nav.client) &&
      CLIENTS[id].toLowerCase().includes(query.toLowerCase())
  );
  return (
    <>
      <div className="panel-search">
        <label className="sr-only" htmlFor="client-query">
          Search clients
        </label>
        <input
          id="client-query"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clients"
          type="search"
          value={query}
        />
        <LinkButton onClick={() => setQuery("")}>Clear</LinkButton>
      </div>
      {clients.map((id) => (
        <button
          className="directory-row"
          key={id}
          onClick={() => open({ kind: "client", clientId: id })}
          type="button"
        >
          <Icon name="building" />
          <div>
            <strong>{CLIENTS[id]}</strong>
            <p className="sub">
              {demo.cases.filter((record) => record.client === id).length} cases
            </p>
          </div>
          <Icon name="right" size={16} />
        </button>
      ))}
      {!clients.length && (
        <Empty title="No clients match this search">
          <LinkButton onClick={() => setQuery("")}>Clear search</LinkButton>
        </Empty>
      )}
    </>
  );
}

function ClientDetail({ clientId }: { clientId: ClientId }) {
  const { demo, open, navigate, replaceSurface } = useWorkspace();
  const records = demo.cases.filter((record) => record.client === clientId);
  return (
    <>
      <LinkButton
        className="back-link"
        onClick={() => replaceSurface({ kind: "clients" })}
      >
        <Icon name="left" size={14} />
        Back to clients
      </LinkButton>
      <p className="tiny muted">
        {records.length} cases ·{" "}
        {[...new Set(records.map((record) => record.personId))].length} people
      </p>
      <div className="button-row">
        <Button
          onClick={() =>
            navigate({
              screen: "cases",
              client: clientId,
              caseTab: "active",
              filters: defaultFilters(),
              page: 1,
            })
          }
          primary
        >
          View this client&apos;s cases
        </Button>
        <Button onClick={() => open({ kind: "employer", clientId })}>
          View employer compliance
        </Button>
      </div>
      <h3 className="subheading">Linked cases</h3>
      <CaseLinks records={records} />
    </>
  );
}

function EmployerPanel({ clientId }: { clientId?: ClientId }) {
  const { demo, nav, open } = useWorkspace();
  const [client, setClient] = useState<ClientId | "all">(
    clientId ?? nav.client
  );
  const items = obligationsInScope(
    demo,
    nav.client,
    nav.screen === "compliance" ? nav.advisor : "all"
  ).filter(
    (item) =>
      item.type === "Employer" && (client === "all" || item.client === client)
  );
  return (
    <>
      <p className="notice">
        Fictional internal planning checks, not verified statutory deadlines.
      </p>
      <div className="panel-search">
        <Select
          label="Employer client filter"
          onChange={(event) =>
            setClient(event.target.value as ClientId | "all")
          }
          value={client}
        >
          <option value={nav.client}>
            {nav.client === "all" ? "All clients" : CLIENTS[nav.client]}
          </option>
          {(Object.keys(CLIENTS) as ClientId[])
            .filter(() => nav.client === "all")
            .map((id) => (
              <option key={id} value={id}>
                {CLIENTS[id]}
              </option>
            ))}
        </Select>
        <LinkButton onClick={() => setClient(nav.client)}>
          Clear client filter
        </LinkButton>
      </div>
      {items.map((item) => (
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
              {CLIENTS[item.client]} · {ADVISORS[item.advisor]} ·{" "}
              {formatDate(item.date)}
            </p>
          </div>
          <Badge tone={item.complete ? "green" : "amber"}>
            {item.complete ? "Complete" : "Open"}
          </Badge>
        </div>
      ))}
      {!items.length && <Empty title="No employer obligations in this view" />}
      <Button
        className="rail-link"
        onClick={() =>
          open({
            kind: "planning",
            clientId: client === "all" ? undefined : client,
          })
        }
        primary
      >
        Add planning obligation
      </Button>
    </>
  );
}

function obligationStatus(item: Obligation): {
  tone: "gray" | "green" | "amber";
  label: string;
} {
  if (item.type === "Visa expiry" || item.type === "Passport") {
    return { tone: "gray", label: "Recorded date" };
  }
  return item.complete
    ? { tone: "green", label: "Complete" }
    : { tone: "amber", label: "Open" };
}

function ObligationDetail({ obligationId }: { obligationId: string }) {
  const { demo, open, openCase, change } = useWorkspace();
  const item = demo.obligations.find((entry) => entry.id === obligationId);
  if (!item) {
    return <Empty title="This obligation was not found" />;
  }
  const record = demo.cases.find((entry) => entry.id === item.caseId);
  const recorded = item.type === "Visa expiry" || item.type === "Passport";
  const advisor = item.inheritAdvisor && record ? record.advisor : item.advisor;
  const status = obligationStatus(item);
  const requestId = item.requestId;
  return (
    <>
      <div className="button-row">
        <Badge tone={status.tone}>{status.label}</Badge>
        <Badge>
          {item.type === "Employer" ? "Internal planning" : item.type}
        </Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Client</dt>
          <dd>
            <LinkButton
              onClick={() => open({ kind: "client", clientId: item.client })}
            >
              {CLIENTS[item.client]}
            </LinkButton>
          </dd>
        </div>
        {record && (
          <>
            <div>
              <dt>Person</dt>
              <dd>
                <LinkButton
                  onClick={() =>
                    open({ kind: "person", personId: record.personId })
                  }
                >
                  {record.name}
                </LinkButton>
              </dd>
            </div>
            <div>
              <dt>Case</dt>
              <dd>
                <LinkButton onClick={() => openCase(record.id)}>
                  {record.id} · {record.route} / {record.country}
                </LinkButton>
              </dd>
            </div>
          </>
        )}
        <div>
          <dt>{recorded ? "Recorded date" : "Due date"}</dt>
          <dd>{formatDate(item.date)}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{item.owner === "Advisor" ? ADVISORS[advisor] : item.owner}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{item.source}</dd>
        </div>
        {item.verification && (
          <div>
            <dt>Last verification</dt>
            <dd>
              {item.verification.outcome} · {formatDate(item.verification.date)}{" "}
              · {item.verification.actor}
              <p className="sub">{item.verification.source}</p>
            </dd>
          </div>
        )}
      </dl>
      {recorded ? (
        <>
          <p className="notice">
            A recorded expiry alone does not determine current work rights.
          </p>
          <div className="button-row">
            <Button
              onClick={() => open({ kind: "verify", obligationId: item.id })}
              primary
            >
              Verify status
            </Button>
            {record && (
              <Button
                onClick={() =>
                  item.type === "Passport"
                    ? open({
                        kind: "compose",
                        caseId: record.id,
                        section: "personal",
                        text: "Please share your passport renewal plans and provide updated information when available.",
                      })
                    : open({ kind: "new", renewalCaseId: record.id })
                }
              >
                {item.type === "Passport" ? "Message client" : "Plan renewal"}
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="button-row">
          <Button
            onClick={() => {
              if (item.type === "Government" && record) {
                open({ kind: "deadline", caseId: record.id });
              } else if (record && item.type !== "Employer") {
                open({ kind: "action", caseId: record.id, taskId: item.id });
              } else {
                open({ kind: "planning", obligationId: item.id });
              }
            }}
          >
            Edit planning details
          </Button>
          {item.complete ? (
            <Button
              onClick={() =>
                change(
                  { type: "complete", obligationId: item.id, complete: false },
                  "Task reopened in demo."
                )
              }
            >
              Reopen
            </Button>
          ) : (
            <Button
              onClick={() => open({ kind: "complete", obligationId: item.id })}
              primary
            >
              Mark complete
            </Button>
          )}
        </div>
      )}
      {requestId && (
        <Button
          className="rail-link"
          onClick={() => open({ kind: "conversation", requestId })}
        >
          View related request
        </Button>
      )}
    </>
  );
}

function DayEvents({ date }: { date: string }) {
  const { demo, nav, open } = useWorkspace();
  const items = obligationsInScope(demo, nav.client, nav.advisor).filter(
    (item) =>
      !item.complete &&
      item.date === date &&
      nav.types.includes(item.type) &&
      matchesCategory(item, nav.category)
  );
  return (
    <>
      <p className="helper">
        Current client, advisor, category, and date-type filters apply.
      </p>
      {items.map((item) => (
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
              {item.caseId ?? CLIENTS[item.client]} · {item.type}
            </p>
          </div>
          <Icon name="right" size={15} />
        </div>
      ))}
      {!items.length && <Empty title="No obligations" />}
    </>
  );
}

function DocumentPreview({
  surface,
}: {
  surface: Extract<Surface, { kind: "document" }>;
}) {
  const { demo, close } = useWorkspace();
  const record = demo.cases.find((item) => item.id === surface.caseId);
  const [index, setIndex] = useState(surface.documentIndex);
  const [zoom, setZoom] = useState(100);
  const documents = record?.sections[surface.section].documents ?? [];
  const document = documents[index];
  if (!document) {
    return <Empty title="This illustrative document was not found" />;
  }
  return (
    <>
      <div className="sectionhead">
        <div>
          <h3>{document.name}</h3>
          <p className="sub">
            Version {document.version} · {record?.name} ·{" "}
            {SECTIONS[surface.section]}
          </p>
        </div>
        <div className="zoom-controls">
          <Button
            aria-label="Zoom out"
            disabled={zoom === 50}
            onClick={() => setZoom((value) => value - 25)}
            small
          >
            −
          </Button>
          <span>{zoom}%</span>
          <Button
            aria-label="Zoom in"
            disabled={zoom === 200}
            onClick={() => setZoom((value) => value + 25)}
            small
          >
            +
          </Button>
        </div>
      </div>
      <p className="notice">Illustrative document - not a real client file</p>
      <div className="document-viewport">
        <article
          className="document-paper"
          style={{ fontSize: `${(14 * zoom) / 100}px` }}
        >
          <p className="document-letterhead">WAYPOINT / FICTIONAL EVIDENCE</p>
          <h2>{document.name.replace(".pdf", "")}</h2>
          <p>Prepared for {record?.name}</p>
          <hr />
          <p>{document.summary}</p>
          <p>
            This readable sample represents one page of supporting material for
            a local prototype. It contains no real client identifiers or legal
            determination.
          </p>
          <p className="document-footnote">
            Illustrative version {document.version} · 18 Oct 2026 · Page 1 of 1
          </p>
        </article>
      </div>
      <div className="dialog-actions">
        <Button
          disabled={index === 0}
          onClick={() => {
            setIndex((value) => value - 1);
            setZoom(100);
          }}
        >
          Previous document
        </Button>
        <Button
          disabled={index === documents.length - 1}
          onClick={() => {
            setIndex((value) => value + 1);
            setZoom(100);
          }}
        >
          Next document
        </Button>
        <Button onClick={() => close()}>Close</Button>
      </div>
    </>
  );
}

function ApprovalReadiness({ caseId }: { caseId: string }) {
  const { demo, openCase, openReview, replaceSurface } = useWorkspace();
  const record = demo.cases.find((item) => item.id === caseId);
  if (!record) {
    return <Empty title="This demo case was not found" />;
  }
  const requests = requestsFor(demo, caseId).filter(
    (item) => item.status !== "Resolved"
  );
  const blockers = approvalBlockers(demo, record);
  return (
    <>
      <p className="form-context">
        {record.id} · {record.name} · Profile v{record.version}
      </p>
      <div className="readiness-item">
        <span>Information supplied</span>
        <Badge tone={record.supplied === 100 ? "green" : "amber"}>
          {record.supplied}%
        </Badge>
        {record.supplied < 100 && (
          <LinkButton onClick={() => openReview(record, "personal")}>
            Go to section
          </LinkButton>
        )}
      </div>
      {sectionIds().map((id) => (
        <div className="readiness-item" key={id}>
          <span>{SECTIONS[id]}</span>
          <Badge
            tone={
              record.sections[id].reviewedVersion === null ? "amber" : "green"
            }
          >
            {record.sections[id].reviewedVersion === null
              ? "Pending"
              : `Reviewed v${record.sections[id].reviewedVersion}`}
          </Badge>
          {record.sections[id].reviewedVersion === null && (
            <LinkButton onClick={() => openReview(record, id)}>
              Go to section
            </LinkButton>
          )}
        </div>
      ))}
      <div className="readiness-item">
        <span>Assigned advisor</span>
        <strong>{ADVISORS[record.advisor]}</strong>
        {!record.advisor && (
          <LinkButton
            onClick={() => replaceSurface({ kind: "assign", caseId })}
          >
            Assign advisor
          </LinkButton>
        )}
      </div>
      <h3 className="subheading">Unresolved requests ({requests.length})</h3>
      {requests.map((request) => (
        <div className="readiness-item" key={request.id}>
          <span>
            {SECTIONS[request.section]} · {request.status}
          </span>
          <LinkButton
            onClick={() =>
              replaceSurface({ kind: "conversation", requestId: request.id })
            }
          >
            View request
          </LinkButton>
        </div>
      ))}
      {!requests.length && <p className="tiny muted">All requests resolved</p>}
      {record.approval ? (
        <div className="notice success-notice">
          <strong>Profile approved to proceed</strong>
          <p>
            Version {record.approval.version} · {record.approval.actor} ·{" "}
            {formatDate(record.approval.date)}
          </p>
          <Button className="rail-link" onClick={() => openCase(record.id)}>
            Open case
          </Button>
        </div>
      ) : (
        <>
          <p className="notice">
            {blockers.length} approval{" "}
            {blockers.length === 1 ? "blocker" : "blockers"}. Profile approval
            does not file the application.
          </p>
          <Button
            disabled={blockers.length > 0}
            onClick={() => replaceSurface({ kind: "approve", caseId })}
            primary
          >
            Approve profile to proceed
          </Button>
          {blockers.length > 0 && (
            <p className="helper">
              Resolve the highlighted requirements to enable approval.
            </p>
          )}
        </>
      )}
    </>
  );
}

function RequestConversation({
  requestId,
  remind,
}: {
  requestId: string;
  remind?: boolean;
}) {
  const { demo, change, openReview, close } = useWorkspace();
  const request = demo.requests.find((item) => item.id === requestId);
  const record = demo.cases.find((item) => item.id === request?.caseId);
  if (!(request && record)) {
    return <Empty title="This request was not found" />;
  }
  const reviewed = record.sections[request.section].reviewedVersion !== null;
  return (
    <>
      <p className="form-context">
        {record.id} · {record.name} · {SECTIONS[request.section]}
      </p>
      <Badge
        tone={
          request.status === "Resolved"
            ? "green"
            : request.status === "Client replied"
              ? "blue"
              : "amber"
        }
      >
        {request.status}
      </Badge>
      <div className="conversation-thread">
        {request.messages.map((message) => (
          <article
            className={`thread-message ${message.actor === "Client" ? "client-message" : ""}`}
            key={message.id}
          >
            <div className="sectionhead">
              <strong>
                {message.actor === "Client" ? record.name : "Advisor"}
              </strong>
              <span className="tiny muted">
                {formatDate(message.date)} · Simulated
              </span>
            </div>
            <p>{message.text}</p>
            <p className="sub">Client-visible · Nothing sent</p>
          </article>
        ))}
      </div>
      <div className="button-row">
        {request.status === "Resolved" ? (
          <Button
            onClick={() =>
              change(
                { type: "reopen-request", requestId },
                "Request reopened in demo. Profile approval invalidated."
              )
            }
          >
            Reopen request
          </Button>
        ) : (
          <Button
            disabled={!reviewed || request.status !== "Client replied"}
            onClick={() =>
              change(
                { type: "resolve-request", requestId },
                "Request resolved in demo."
              )
            }
          >
            Resolve request
          </Button>
        )}
        <LinkButton onClick={() => openReview(record, request.section)}>
          Review associated section
        </LinkButton>
      </div>
      {request.status !== "Resolved" &&
        (!reviewed || request.status !== "Client replied") && (
          <p className="helper">
            A client reply and a completed review of the associated section are
            required before resolution.
          </p>
        )}
      <h3 className="subheading">Reply / reminder</h3>
      {request.reminderDate && (
        <p className="sub">
          Last simulated reminder: {formatDate(request.reminderDate)}
        </p>
      )}
      <ClientMessageForm
        initialText={
          remind
            ? "Please review the outstanding request and reply when ready."
            : ""
        }
        onRecord={(text) => {
          if (
            change(
              { type: "message", requestId, text },
              "Simulated message recorded; nothing sent."
            )
          ) {
            close(true);
          }
        }}
        recipients={[emailFor(record)]}
        section={request.section}
      />
    </>
  );
}

type SearchResult = {
  group: "Person" | "Case" | "Client";
  label: string;
  detail: string;
  surface: Surface;
};
function GlobalSearch() {
  const { demo, nav, open } = useWorkspace();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const scoped = demo.cases.filter(
    (record) => nav.client === "all" || record.client === nav.client
  );
  const normalised = query.trim().toLowerCase();
  const matches = (record: CaseRecord) =>
    `${record.name} ${record.id} ${CLIENTS[record.client]} ${record.route} ${record.country} ${COUNTRIES[record.country]}`
      .toLowerCase()
      .includes(normalised);
  const people = [
    ...new Map(
      scoped.filter(matches).map((record) => [record.personId, record])
    ).values(),
  ];
  const results: SearchResult[] = normalised
    ? [
        ...people.slice(0, 2).map(
          (record): SearchResult => ({
            group: "Person",
            label: record.name,
            detail: `${CLIENTS[record.client]} · ${scoped
              .filter((item) => item.personId === record.personId)
              .map((item) => `${item.id} ${item.route}`)
              .join(", ")}`,
            surface: { kind: "person", personId: record.personId },
          })
        ),
        ...scoped
          .filter(matches)
          .slice(0, 4)
          .map(
            (record): SearchResult => ({
              group: "Case",
              label: `${record.id} · ${record.name}`,
              detail: `${record.route} / ${record.country} · ${CLIENTS[record.client]}`,
              surface: { kind: "case", caseId: record.id, tab: "overview" },
            })
          ),
        ...(Object.keys(CLIENTS) as ClientId[])
          .filter(
            (id) =>
              (nav.client === "all" || id === nav.client) &&
              CLIENTS[id].toLowerCase().includes(normalised)
          )
          .slice(0, 2)
          .map(
            (id): SearchResult => ({
              group: "Client",
              label: CLIENTS[id],
              detail: `${scoped.filter((record) => record.client === id).length} cases`,
              surface: { kind: "client", clientId: id },
            })
          ),
      ].slice(0, 8)
    : [];
  return (
    <>
      <div className="panel-search">
        <label className="sr-only" htmlFor="global-query">
          Search people, cases, or clients
        </label>
        <input
          aria-activedescendant={
            results[highlight] ? `search-result-${highlight}` : undefined
          }
          aria-controls="global-results"
          aria-expanded={results.length > 0}
          autoComplete="off"
          data-autofocus
          id="global-query"
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((value) =>
                results.length
                  ? (value +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      results.length) %
                    results.length
                  : 0
              );
            } else if (event.key === "Enter" && results[highlight]) {
              event.preventDefault();
              open(results[highlight].surface);
            }
          }}
          placeholder="Search people, cases, or clients..."
          ref={input}
          role="combobox"
          value={query}
        />
        <LinkButton
          onClick={() => {
            setQuery("");
            setHighlight(0);
            input.current?.focus();
          }}
        >
          Clear
        </LinkButton>
      </div>
      <p className="helper">
        Searching within{" "}
        {nav.client === "all" ? "all clients" : CLIENTS[nav.client]}
      </p>
      <div aria-label="Search results" id="global-results" role="listbox">
        {results.map((result, index) => (
          <div key={`${result.group}-${result.label}`}>
            {index === 0 || results[index - 1].group !== result.group ? (
              <h3 className="search-group-label">
                {result.group === "Person" ? "People" : `${result.group}s`}
              </h3>
            ) : null}
            <button
              aria-selected={index === highlight}
              className={`search-result ${index === highlight ? "highlighted" : ""}`}
              id={`search-result-${index}`}
              onClick={() => open(result.surface)}
              onFocus={() => setHighlight(index)}
              role="option"
              tabIndex={-1}
              type="button"
            >
              <strong>{result.label}</strong>
              <span className="sub">{result.detail}</span>
            </button>
          </div>
        ))}
      </div>
      {!normalised && <Empty title="Type to search" />}
      {normalised && !results.length && (
        <Empty title="No matches in this client scope" />
      )}
    </>
  );
}

function RegisterControls({ surface }: { surface: Surface }) {
  const { demo, nav, navigate, close } = useWorkspace();
  const [columns, setColumns] = useState([...nav.columns]);
  const [filters, setFilters] = useState(structuredClone(nav.filters));
  if (surface.kind === "columns") {
    return (
      <>
        <p className="helper">
          Person / client is always visible. Changes apply only when you choose
          Apply.
        </p>
        <div className="checkbox-list">
          {(Object.keys(COLUMN_LABELS) as Column[]).map((column) => (
            <label className="check-option" key={column}>
              <input
                checked={columns.includes(column)}
                disabled={column === "person"}
                onChange={(event) =>
                  setColumns((values) =>
                    event.target.checked
                      ? [...values, column]
                      : values.filter((item) => item !== column)
                  )
                }
                type="checkbox"
              />
              {COLUMN_LABELS[column]}
            </label>
          ))}
        </div>
        <div className="dialog-actions">
          <Button onClick={() => setColumns([...DEFAULT_COLUMNS])}>
            Reset to default
          </Button>
          <Button onClick={() => close()}>Cancel</Button>
          <Button onClick={() => navigate({ columns })} primary>
            Apply
          </Button>
        </div>
      </>
    );
  }
  if (surface.kind === "readiness-filter") {
    return (
      <>
        <p className="helper">
          None selected means all readiness states. Changes apply immediately.
        </p>
        <div className="checkbox-list">
          {(Object.keys(REVIEW_LABELS) as ReviewCode[]).map((code) => (
            <label className="check-option" key={code}>
              <input
                checked={nav.filters.readiness.includes(code)}
                onChange={(event) =>
                  navigate({
                    filters: {
                      ...nav.filters,
                      readiness: event.target.checked
                        ? [...nav.filters.readiness, code]
                        : nav.filters.readiness.filter((item) => item !== code),
                    },
                    page: 1,
                    overlays: nav.overlays,
                  })
                }
                type="checkbox"
              />
              {REVIEW_LABELS[code]}
            </label>
          ))}
        </div>
        <div className="dialog-actions">
          <Button
            onClick={() =>
              navigate({
                filters: { ...nav.filters, readiness: [] },
                page: 1,
                overlays: nav.overlays,
              })
            }
          >
            Clear selection
          </Button>
          <Button onClick={() => close()}>Close</Button>
        </div>
      </>
    );
  }
  const routes = [...new Set(demo.cases.map((record) => record.route))].sort();
  const stages = [
    "Not filed",
    "Filed",
    "In review",
    "Evidence requested",
    "Approved",
    "Denied",
    "Withdrawn",
  ] as const;
  const owners = [
    "Advisor",
    "Client",
    "Employer",
    "Authority",
    "None",
  ] as const;
  return (
    <>
      <div className="form-field">
        <label htmlFor="case-search">Case name or ID</label>
        <input
          id="case-search"
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              search: event.target.value,
            }))
          }
          type="search"
          value={filters.search}
        />
      </div>
      <fieldset className="checkbox-list">
        <legend>Routes</legend>
        {routes.map((route) => (
          <label className="check-option" key={route}>
            <input
              checked={filters.routes.includes(route)}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  routes: event.target.checked
                    ? [...current.routes, route]
                    : current.routes.filter((value) => value !== route),
                }))
              }
              type="checkbox"
            />
            {route}
          </label>
        ))}
      </fieldset>
      <fieldset className="checkbox-list">
        <legend>Application stage</legend>
        {stages.map((stage) => (
          <label className="check-option" key={stage}>
            <input
              checked={filters.stages.includes(stage)}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  stages: event.target.checked
                    ? [...current.stages, stage]
                    : current.stages.filter((value) => value !== stage),
                }))
              }
              type="checkbox"
            />
            {stage}
          </label>
        ))}
      </fieldset>
      <fieldset className="checkbox-list">
        <legend>Waiting on</legend>
        {owners.map((owner) => (
          <label className="check-option" key={owner}>
            <input
              checked={filters.owners.includes(owner)}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  owners: event.target.checked
                    ? [...current.owners, owner]
                    : current.owners.filter((value) => value !== owner),
                }))
              }
              type="checkbox"
            />
            {owner}
          </label>
        ))}
      </fieldset>
      <div className="dialog-actions">
        <Button
          onClick={() =>
            setFilters((current) => ({
              ...current,
              search: "",
              routes: [],
              stages: [],
              owners: [],
            }))
          }
        >
          Clear all
        </Button>
        <Button onClick={() => close()}>Cancel</Button>
        <Button onClick={() => navigate({ filters, page: 1 })} primary>
          Apply
        </Button>
      </div>
    </>
  );
}

function SavedViews() {
  const { savedViews, navigate, open } = useWorkspace();
  const [selected, setSelected] = useState(savedViews[0]?.id ?? "");
  const view = savedViews.find((item) => item.id === selected) ?? savedViews[0];
  if (!view) {
    return <Empty title="No saved views" />;
  }
  return (
    <>
      <p className="notice">
        Applying a saved view preserves the current global client scope.
      </p>
      <div className="form-field">
        <label htmlFor="saved-view">Saved view</label>
        <select
          id="saved-view"
          onChange={(event) => setSelected(event.target.value)}
          value={view.id}
        >
          {savedViews.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="dialog-actions">
        <Button onClick={() => open({ kind: "delete-view", viewId: view.id })}>
          Delete
        </Button>
        <Button
          onClick={() =>
            navigate({
              caseTab: view.tab,
              filters: structuredClone(view.filters),
              columns: [...view.columns],
              sort: view.sort,
              page: 1,
            })
          }
          primary
        >
          Apply
        </Button>
      </div>
    </>
  );
}

function PolicyPanel() {
  const { demo, nav, open, openCase } = useWorkspace();
  const [selected, setSelected] = useState<string[]>([]);
  const candidates = demo.cases.filter(
    (record) =>
      POLICY_CASES.includes(record.id) &&
      (nav.client === "all" || record.client === nav.client)
  );
  const created = (caseId: string) =>
    demo.obligations.some(
      (item) => item.policyId === POLICY_ID && item.caseId === caseId
    );
  const creatable = selected.filter((id) => !created(id));
  return (
    <>
      <Badge>Fictional policy example</Badge>
      <h3 className="subheading">Work visa guidance updated</h3>
      <p>
        Mock source summary: illustrative work visa guidance may warrant a
        review of selected New Zealand and Australia cases. No real policy
        source, legal rule, or recommendation is asserted.
      </p>
      <p className="notice">
        Advisor assessment required before any client advice. Nothing is created
        or sent automatically.
      </p>
      <div className="sectionhead">
        <span>
          {candidates.length} of 7 candidate cases · {selected.length} selected
        </span>
        <LinkButton
          onClick={() =>
            setSelected(
              selected.length === candidates.length
                ? []
                : candidates.map((record) => record.id)
            )
          }
        >
          {selected.length === candidates.length && candidates.length > 0
            ? "Clear selection"
            : "Select all visible"}
        </LinkButton>
      </div>
      {candidates.map((record) => (
        <div className="policy-candidate" key={record.id}>
          <label>
            <input
              checked={selected.includes(record.id)}
              onChange={(event) =>
                setSelected((values) =>
                  event.target.checked
                    ? [...values, record.id]
                    : values.filter((id) => id !== record.id)
                )
              }
              type="checkbox"
            />
            <span>
              <strong>
                {record.name} · {record.id}
              </strong>
              <span className="sub">
                {record.route} / {record.country} · {CLIENTS[record.client]}
              </span>
              {created(record.id) && (
                <Badge tone="green">Already created</Badge>
              )}
            </span>
          </label>
          <Button onClick={() => openCase(record.id)} small>
            Open case
          </Button>
        </div>
      ))}
      {!candidates.length && (
        <Empty title="No candidate cases in this client scope" />
      )}
      <div className="dialog-actions">
        <Button
          disabled={!creatable.length}
          onClick={() => open({ kind: "policy-tasks", caseIds: creatable })}
          primary
        >
          Create review tasks
        </Button>
        <Button
          disabled={!selected.length}
          onClick={() => open({ kind: "policy-message", caseIds: selected })}
        >
          Draft client update
        </Button>
      </div>
      {!selected.length && (
        <p className="helper">
          Select at least one case to enable these actions.
        </p>
      )}
      {selected.length > 0 && !creatable.length && (
        <p className="helper">
          Review tasks already exist for all selected cases. Duplicate tasks
          will not be created.
        </p>
      )}
    </>
  );
}

function ConfirmationSurface({ surface }: { surface: Surface }) {
  const { demo, nav, change, close, reset, deleteView, replaceSurface } =
    useWorkspace();
  if (surface.kind === "reset") {
    return (
      <>
        <p>
          Restore the initial fictional cases, filters, requests, approvals,
          history, and saved views? All local demo changes will be lost.
        </p>
        <div className="dialog-actions">
          <Button onClick={() => close()}>Cancel</Button>
          <Button onClick={reset} primary>
            Reset
          </Button>
        </div>
      </>
    );
  }
  if (surface.kind === "delete-view") {
    const view = surface.viewId;
    return (
      <>
        <p>
          Delete this saved view from the demo? Case records and the current
          filters will not change.
        </p>
        <div className="dialog-actions">
          <Button onClick={() => close()}>Cancel</Button>
          <Button
            onClick={() => {
              deleteView(view);
              close(true);
            }}
            primary
          >
            Delete
          </Button>
        </div>
      </>
    );
  }
  if (surface.kind === "simulate") {
    const record = demo.cases.find((item) => item.id === nav.reviewCaseId);
    if (!record) {
      return <Empty title="This demo case was not found" />;
    }
    return (
      <>
        <p>
          Apply a simulated client update to {record.name}&apos;s{" "}
          {SECTIONS[nav.section]} section?
        </p>
        <p className="notice">
          This creates profile v{record.version + 1}, reopens this
          section&apos;s review, and invalidates any current approval. Other
          section decisions and the application stage are preserved.
        </p>
        <div className="dialog-actions">
          <Button onClick={() => close()}>Cancel</Button>
          <Button
            onClick={() => {
              if (
                change(
                  { type: "simulate", caseId: record.id, section: nav.section },
                  "Client update simulated. The changed section needs a fresh review."
                )
              ) {
                close(true);
              }
            }}
            primary
          >
            Apply simulated update
          </Button>
        </div>
      </>
    );
  }
  if (surface.kind === "complete") {
    const item = demo.obligations.find(
      (entry) => entry.id === surface.obligationId
    );
    if (!item) {
      return <Empty title="This task was not found" />;
    }
    return (
      <>
        <h3>{item.title}</h3>
        <p className="sub">
          {item.caseId ?? CLIENTS[item.client]} · {item.type} ·{" "}
          {formatDate(item.date)}
        </p>
        <p className="notice">
          This completes only the local task, not a request or government
          application.
        </p>
        <div className="dialog-actions">
          <Button onClick={() => close()}>Cancel</Button>
          <Button
            onClick={() => {
              if (
                change(
                  { type: "complete", obligationId: item.id, complete: true },
                  "Task completed in demo. Application stage unchanged."
                )
              ) {
                close(true);
              }
            }}
            primary
          >
            Complete in demo
          </Button>
        </div>
      </>
    );
  }
  if (surface.kind === "approve") {
    const record = demo.cases.find((item) => item.id === surface.caseId);
    if (!record) {
      return <Empty title="This demo case was not found" />;
    }
    return (
      <>
        <dl className="detail-list">
          <div>
            <dt>Case / person</dt>
            <dd>
              {record.id} · {record.name}
            </dd>
          </div>
          <div>
            <dt>Profile version</dt>
            <dd>{record.version}</dd>
          </div>
          <div>
            <dt>Approver</dt>
            <dd>A. Singh</dd>
          </div>
          <div>
            <dt>Demo date</dt>
            <dd>18 Oct 2026</dd>
          </div>
        </dl>
        <p className="notice">
          Confirm advisor approval to begin preparation. This does not file or
          approve a government application.
        </p>
        <div className="dialog-actions">
          <Button onClick={() => close()}>Cancel</Button>
          <Button
            disabled={approvalBlockers(demo, record).length > 0}
            onClick={() => {
              if (
                change(
                  { type: "approve", caseId: record.id },
                  "Profile approved; application preparation can begin."
                )
              ) {
                replaceSurface({ kind: "readiness", caseId: record.id }, true);
              }
            }}
            primary
          >
            Confirm approval
          </Button>
        </div>
      </>
    );
  }
  if (surface.kind === "preparation") {
    const record = demo.cases.find((item) => item.id === surface.caseId);
    if (!record) {
      return <Empty title="This demo case was not found" />;
    }
    return (
      <>
        <Badge tone="green">
          {record.preparation ? "Preparation started" : "Profile approved"}
        </Badge>
        <h3 className="subheading">
          {record.id} · {record.name}
        </h3>
        <p>
          {record.route} / {COUNTRIES[record.country]} · Application:{" "}
          {record.stage}
        </p>
        <p className="notice">Form preparation is outside this prototype.</p>
        {record.preparation ? (
          <div className="dialog-actions">
            <Button onClick={() => close()}>Close</Button>
          </div>
        ) : (
          <div className="dialog-actions">
            <Button onClick={() => close()}>Cancel</Button>
            <Button
              onClick={() =>
                change(
                  { type: "prepare", caseId: record.id },
                  "Preparation started in demo. Application remains Not filed."
                )
              }
              primary
            >
              Start demo preparation
            </Button>
          </div>
        )}
      </>
    );
  }
  return null;
}

function Utilities({ surface }: { surface: Surface }) {
  const { nav, navigate, replaceSurface, close } = useWorkspace();
  if (surface.kind === "about") {
    return (
      <>
        <div className="about-mark">waypoint</div>
        <p>
          An advisor-first workspace for moving fictional cases from intake to
          preparation and compliance planning.
        </p>
        <ul className="about-list">
          <li>Demo - fictional data; no legal determinations.</li>
          <li>
            No external messages, document services, policy feeds, or government
            submissions.
          </li>
          <li>
            Changes survive navigation in this tab; reload resets the demo.
          </li>
          <li>Fixed reference date: 18 Oct 2026.</li>
          <li>
            A. Singh has demo access to all advisors&apos; fictional cases.
          </li>
        </ul>
        <div className="dialog-actions">
          <Button onClick={() => close()}>Close</Button>
        </div>
      </>
    );
  }
  if (surface.kind === "user") {
    return (
      <>
        <div className="personhead">
          <Avatar large name="A. Singh" />
          <div>
            <h3>A. Singh</h3>
            <p className="sub">Immigration advisor</p>
          </div>
        </div>
        <p className="notice">Demo access: all advisors</p>
      </>
    );
  }
  if (surface.kind === "menu") {
    return (
      <nav aria-label="Mobile navigation" className="mobile-navigation">
        {(["work", "cases", "compliance"] as const).map((screen) => (
          <Button key={screen} onClick={() => navigate({ screen })}>
            <Icon name={screen} />
            {screen === "work"
              ? "My work"
              : screen === "cases"
                ? "Cases"
                : "Compliance"}
          </Button>
        ))}
        <Button onClick={() => replaceSurface({ kind: "people" })}>
          People
        </Button>
        <Button onClick={() => replaceSurface({ kind: "clients" })}>
          Clients
        </Button>
        <Button onClick={() => replaceSurface({ kind: "user" })}>
          A. Singh · Immigration advisor
        </Button>
      </nav>
    );
  }
  return (
    <div className="menu-list">
      <button onClick={() => replaceSurface({ kind: "about" })} type="button">
        <Icon name="info" />
        About this prototype
      </button>
      {nav.screen === "review" && (
        <button
          onClick={() => replaceSurface({ kind: "simulate" })}
          type="button"
        >
          <Icon name="plus" />
          Simulate client update
        </button>
      )}
      <button onClick={() => replaceSurface({ kind: "reset" })} type="button">
        <Icon name="left" />
        Reset demo
      </button>
    </div>
  );
}

function SurfaceBody({ surface }: { surface: Surface }) {
  switch (surface.kind) {
    case "case":
      return <CasePanel surface={surface} />;
    case "people":
      return <PeopleDirectory />;
    case "person":
      return <PersonDetail personId={surface.personId} />;
    case "clients":
      return <ClientsDirectory />;
    case "client":
      return <ClientDetail clientId={surface.clientId} />;
    case "employer":
      return <EmployerPanel clientId={surface.clientId} />;
    case "obligation":
      return <ObligationDetail obligationId={surface.obligationId} />;
    case "day":
      return <DayEvents date={surface.date} />;
    case "history":
      return <HistoryDialog caseId={surface.caseId} />;
    case "document":
      return <DocumentPreview surface={surface} />;
    case "readiness":
      return <ApprovalReadiness caseId={surface.caseId} />;
    case "conversation":
      return (
        <RequestConversation
          remind={surface.remind}
          requestId={surface.requestId}
        />
      );
    case "search":
      return <GlobalSearch />;
    case "columns":
    case "readiness-filter":
    case "more-filters":
      return <RegisterControls surface={surface} />;
    case "saved-views":
      return <SavedViews />;
    case "policy":
      return <PolicyPanel />;
    case "approve":
    case "preparation":
    case "complete":
    case "simulate":
    case "reset":
    case "delete-view":
      return <ConfirmationSurface surface={surface} />;
    case "demo":
    case "about":
    case "user":
    case "menu":
      return <Utilities surface={surface} />;
    default:
      return <WorkflowForm surface={surface} />;
  }
}

const TITLES: Partial<Record<Surface["kind"], string>> = {
  people: "People",
  clients: "Clients",
  employer: "Employer compliance",
  search: "Search workspace",
  history: "Case history",
  document: "Document preview",
  readiness: "Approval readiness",
  approve: "Confirm profile approval",
  conversation: "Request conversation",
  compose: "Request clarification",
  assign: "Assign advisor",
  action: "Set next action",
  deadline: "Record response deadline",
  complete: "Complete task in demo?",
  preparation: "Application preparation",
  new: "New case",
  verify: "Verify recorded status",
  planning: "Planning obligation",
  policy: "Assess policy impact",
  "policy-tasks": "Create policy review tasks",
  "policy-message": "Draft client update",
  columns: "Register columns",
  "more-filters": "More case filters",
  "readiness-filter": "Profile readiness filter",
  "save-view": "Save current view",
  "saved-views": "Saved views",
  "delete-view": "Delete saved view?",
  about: "About this prototype",
  demo: "Demo - fictional data",
  user: "Current advisor",
  reset: "Reset demo?",
  simulate: "Simulate client update",
  menu: "Workspace menu",
};

export function SurfaceHost() {
  const { demo, nav, close, hasDirty, editEpoch, discarding, returnFocusFor } =
    useWorkspace();
  return nav.overlays.map((surface, index) => {
    let title = TITLES[surface.kind] ?? "Details";
    if (surface.kind === "case") {
      title =
        demo.cases.find((record) => record.id === surface.caseId)?.name ??
        "Case not found";
    }
    if (surface.kind === "person") {
      title =
        demo.cases.find((record) => record.personId === surface.personId)
          ?.name ?? "Person details";
    }
    if (surface.kind === "client") {
      title = CLIENTS[surface.clientId];
    }
    if (surface.kind === "obligation") {
      title =
        demo.obligations.find((item) => item.id === surface.obligationId)
          ?.title ?? "Obligation details";
    }
    if (surface.kind === "day") {
      title = `Obligations · ${formatDate(surface.date)}`;
    }
    if (surface.kind === "new" && surface.renewalCaseId) {
      title = "Plan renewal";
    }
    const drawer = [
      "case",
      "people",
      "person",
      "clients",
      "client",
      "employer",
      "obligation",
      "verify",
      "policy",
      "more-filters",
    ].includes(surface.kind);
    return (
      <DirtyScope.Provider
        key={`${surface.key}-${editEpoch}`}
        value={`surface-${surface.key}`}
      >
        <Overlay
          active={index === nav.overlays.length - 1 && !discarding}
          dismissOutside={
            !(
              hasDirty(`surface-${surface.key}`) ||
              [
                "reset",
                "approve",
                "complete",
                "simulate",
                "delete-view",
              ].includes(surface.kind)
            )
          }
          drawer={drawer}
          index={index}
          onClose={() => close()}
          returnFocus={returnFocusFor(surface.key)}
          title={title}
          wide={surface.kind === "document" || surface.kind === "search"}
        >
          <SurfaceBody surface={surface} />
        </Overlay>
      </DirtyScope.Provider>
    );
  });
}
