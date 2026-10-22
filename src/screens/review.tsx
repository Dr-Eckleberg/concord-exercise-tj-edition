import { useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Icon,
  LinkButton,
  ReviewBadge,
} from "../components/ui";
import {
  ADVISORS,
  type CaseRecord,
  CLIENTS,
  COUNTRIES,
  changedSections,
  pendingSections,
  requestsFor,
  reviewCode,
  SECTIONS,
  type SectionId,
  sectionIds,
} from "../data/workspace";
import { useDirty, useWorkspace } from "../workspace-context";

function SectionReview({
  record,
  sectionId,
}: {
  record: CaseRecord;
  sectionId: SectionId;
}) {
  const { demo, change, open } = useWorkspace();
  const section = record.sections[sectionId];
  const [checks, setChecks] = useState([...section.checks]);
  const [note, setNote] = useState(section.note);
  const [showPrevious, setShowPrevious] = useState(false);
  const reviewed = section.reviewedVersion !== null;
  const requestList = requestsFor(demo, record.id).filter(
    (request) => request.section === sectionId
  );
  const checksSignature = section.checks.join(",");
  useEffect(() => {
    setChecks(checksSignature.split(",").map((value) => value === "true"));
  }, [checksSignature]);
  useDirty(
    note !== section.note ||
      checks.some((value, index) => value !== section.checks[index])
  );
  return (
    <>
      <section className="reviewcard">
        <div className="cardtop">
          <h2>{SECTIONS[sectionId]}</h2>
          {reviewed ? (
            <Badge tone="green">Reviewed · v{section.reviewedVersion}</Badge>
          ) : section.fields.some((field) => field.changedVersion) ? (
            <Badge tone="blue">Updated by client</Badge>
          ) : (
            <Badge tone="amber">Pending review</Badge>
          )}
        </div>
        {section.fields.map((field) => (
          <div
            className={`field ${field.changedVersion && !reviewed ? "changed" : ""}`}
            key={field.label}
          >
            <div className="label">{field.label}</div>
            <p>{field.value}</p>
            {field.previous && (
              <>
                <div className="delta">
                  {reviewed
                    ? "Reviewed change"
                    : `Changed in version ${field.changedVersion}`}{" "}
                  ·{" "}
                  <LinkButton onClick={() => setShowPrevious(!showPrevious)}>
                    {showPrevious
                      ? "Hide previous answer"
                      : "Show previous answer"}
                  </LinkButton>
                </div>
                {showPrevious && (
                  <div className="comparison">
                    <div>
                      <span className="label">
                        Previous v{(field.changedVersion ?? record.version) - 1}
                      </span>
                      <p>{field.previous}</p>
                    </div>
                    <div>
                      <span className="label">
                        Current v{field.changedVersion}
                      </span>
                      <p>{field.value}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div className="label">Supporting evidence</div>
        {section.documents.map((document, documentIndex) => (
          <div className="document-row" key={document.name}>
            <span aria-hidden="true" className="docicon">
              PDF
            </span>
            <div>
              <strong>{document.name}</strong>
              <p className="sub">
                {document.version === record.version
                  ? `Added with version ${document.version}`
                  : "Previously reviewed"}{" "}
                · Illustrative document
              </p>
            </div>
            <LinkButton
              onClick={() =>
                open({
                  kind: "document",
                  caseId: record.id,
                  section: sectionId,
                  documentIndex,
                })
              }
            >
              Preview
            </LinkButton>
          </div>
        ))}
        {!section.documents.length && (
          <p className="muted tiny">No evidence recorded</p>
        )}
        <div className="review-checks">
          <div className="label">Section review</div>
          {section.checkLabels.map((label, index) => (
            <label className="check-row" key={label}>
              <input
                checked={checks[index]}
                disabled={reviewed}
                onChange={(event) =>
                  setChecks((values) =>
                    values.map((value, item) =>
                      item === index ? event.target.checked : value
                    )
                  )
                }
                type="checkbox"
              />
              <span>{label}</span>
              <Badge tone={checks[index] ? "green" : "amber"}>
                {checks[index] ? "Reviewed" : "Pending"}
              </Badge>
            </label>
          ))}
          <div className="button-row">
            {reviewed ? (
              <Button
                onClick={() => {
                  const next = change(
                    {
                      type: "reopen-section",
                      caseId: record.id,
                      section: sectionId,
                    },
                    "Section reopened in demo. Profile approval requires a fresh review."
                  );
                  const updated = next?.cases.find(
                    (item) => item.id === record.id
                  );
                  if (updated) {
                    setChecks([...updated.sections[sectionId].checks]);
                  }
                }}
              >
                Reopen review
              </Button>
            ) : (
              <Button
                disabled={!checks.every(Boolean)}
                onClick={() =>
                  change(
                    {
                      type: "review",
                      caseId: record.id,
                      section: sectionId,
                      checks,
                    },
                    "Section review saved in demo."
                  )
                }
                primary
              >
                Mark section reviewed
              </Button>
            )}
            <Button
              onClick={() =>
                open({
                  kind: "compose",
                  caseId: record.id,
                  section: sectionId,
                  field: section.fields.find((field) => field.previous)?.label,
                })
              }
            >
              Request clarification
            </Button>
          </div>
          {!(reviewed || checks.every(Boolean)) && (
            <p className="helper">
              Complete all section checks to mark this section reviewed.
            </p>
          )}
        </div>
      </section>
      <aside className="review-side">
        <section className="sidecard">
          <div className="label">Internal / not shared with client</div>
          <h3>Advisor assessment</h3>
          <label className="sr-only" htmlFor="internal-note">
            Internal note for {SECTIONS[sectionId]}
          </label>
          <textarea
            id="internal-note"
            maxLength={2000}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            value={note}
          />
          <p className="helper">Example note · Not a legal assessment</p>
          <Button
            disabled={note === section.note}
            onClick={() =>
              change(
                {
                  type: "note",
                  caseId: record.id,
                  section: sectionId,
                  text: note,
                },
                "Internal note saved in demo."
              )
            }
            small
          >
            Save internal note
          </Button>
        </section>
        <section className="sidecard">
          <div className="label">Client-visible request</div>
          <h3>Previous clarification</h3>
          {requestList.length ? (
            requestList.map((request) => (
              <div className="request-summary" key={request.id}>
                <p>{request.body}</p>
                <Badge
                  tone={
                    request.status === "Client replied"
                      ? "blue"
                      : request.status === "Resolved"
                        ? "green"
                        : "amber"
                  }
                >
                  {request.status}
                </Badge>
                {request.response && (
                  <p className="tiny muted">{request.response}</p>
                )}
                <Button
                  onClick={() =>
                    open({ kind: "conversation", requestId: request.id })
                  }
                  small
                >
                  View conversation
                </Button>
              </div>
            ))
          ) : (
            <>
              <p className="tiny muted">No request for this section</p>
              <Button
                className="rail-link"
                onClick={() =>
                  open({
                    kind: "compose",
                    caseId: record.id,
                    section: sectionId,
                  })
                }
                small
              >
                Request clarification
              </Button>
            </>
          )}
        </section>
      </aside>
    </>
  );
}

export function ProfileReview() {
  const { demo, nav, navigate, open, openCase, backFromReview, editEpoch } =
    useWorkspace();
  const record = demo.cases.find((item) => item.id === nav.reviewCaseId);
  if (!record) {
    return (
      <main className="content">
        <Empty title="This demo case was not found">
          <Button onClick={backFromReview}>Back to workspace</Button>
        </Empty>
      </main>
    );
  }
  const pending = pendingSections(record).length;
  const unresolved = requestsFor(demo, record.id).filter(
    (item) => item.status !== "Resolved"
  ).length;
  return (
    <main className="content review-content">
      <LinkButton className="back-link" onClick={backFromReview}>
        <Icon name="left" size={14} />
        {nav.origin === "work"
          ? "Back to my review queue"
          : nav.origin === "cases"
            ? "Back to cases"
            : "Back to compliance"}
      </LinkButton>
      <header className="heading">
        <div className="personhead">
          <Avatar large name={record.name} />
          <div>
            <h1>{record.name}</h1>
            <p>
              {record.route} · {COUNTRIES[record.country]} ·{" "}
              {record.advisor
                ? `Assigned to ${ADVISORS[record.advisor]}`
                : "Unassigned"}
            </p>
          </div>
        </div>
        <Button onClick={() => open({ kind: "history", caseId: record.id })}>
          View case history
        </Button>
      </header>
      <div className="readiness-strip">
        <div>
          <div className="label">Information supplied</div>
          <strong>{record.supplied}% complete</strong>
          <div aria-hidden="true" className="progress-bar">
            <span style={{ width: `${record.supplied}%` }} />
          </div>
        </div>
        <div>
          <div className="label">Advisor review</div>
          <ReviewBadge code={reviewCode(demo, record)} />
        </div>
        <div>
          <div className="label">Application</div>
          <strong>{record.stage}</strong>
        </div>
        <div>
          <div className="label">Current profile</div>
          <strong>Version {record.version}</strong>
          <p className="sub">
            {changedSections(record).length} sections updated by client
          </p>
        </div>
      </div>
      {record.stage !== "Not filed" && record.review === "U" && pending > 0 && (
        <p className="notice warning-notice">
          Profile changed after filing; review needed. The application stage has
          not changed.
        </p>
      )}
      <div className="review-layout">
        <nav aria-label="Profile sections" className="profile-sections">
          <div className="eyebrow">Profile sections</div>
          {sectionIds().map((id) => {
            const section = record.sections[id];
            const reviewed = section.reviewedVersion !== null;
            const changed = section.fields.filter(
              (field) => field.changedVersion
            ).length;
            return (
              <button
                aria-current={nav.section === id ? "step" : undefined}
                className={`section-link ${nav.section === id ? "active" : ""}`}
                key={id}
                onClick={() => navigate({ section: id })}
                type="button"
              >
                <span>{SECTIONS[id]}</span>
                {reviewed ? (
                  <>
                    <Icon name="check" size={14} />
                    <span className="sr-only">
                      Reviewed version {section.reviewedVersion}
                    </span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">{changed || "—"}</span>
                    <span className="sr-only">
                      {changed
                        ? `${changed} changed fields awaiting review`
                        : "Pending review"}
                    </span>
                  </>
                )}
              </button>
            );
          })}
          <p className="notice section-notice">
            Changed sections return to review. Previously reviewed sections
            remain identifiable.
          </p>
        </nav>
        <SectionReview
          key={`${record.id}-${nav.section}-${editEpoch}`}
          record={record}
          sectionId={nav.section}
        />
      </div>
      <footer className="approval-bar">
        <div>
          <strong>
            {record.approval
              ? "Profile approved to proceed"
              : `${pending} ${pending === 1 ? "section still needs" : "sections still need"} your review`}
          </strong>
          <p>
            {unresolved} unresolved {unresolved === 1 ? "request" : "requests"}.
            All required reviews and requests must be resolved before profile
            approval. Approval does not mean the application is ready to file.
          </p>
        </div>
        <div className="button-row">
          {record.approval && (
            <Button onClick={() => openCase(record.id)}>View ready case</Button>
          )}
          <Button
            onClick={() => open({ kind: "readiness", caseId: record.id })}
          >
            Check approval readiness
          </Button>
        </div>
      </footer>
      <p className="sr-only">Client: {CLIENTS[record.client]}</p>
    </main>
  );
}
