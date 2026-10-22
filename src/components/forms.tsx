import { type FormEvent, type ReactNode, useId, useRef, useState } from "react";
import {
  ADVISORS,
  type Advisor,
  addDays,
  type CaseRecord,
  CLIENTS,
  type ClientId,
  COUNTRIES,
  type Country,
  emailFor,
  formatDate,
  isDate,
  type Owner,
  SECTIONS,
  type SectionId,
  TODAY,
} from "../data/workspace";
import { type Surface, useDirty, useWorkspace } from "../workspace-context";
import { Button, Empty, LinkButton } from "./ui";

type Values = Record<string, string>;
type Option = { value: string; label: string };
type FormField = {
  name: string;
  label: string;
  type?: "text" | "date" | "textarea" | "select";
  options?: Option[];
  initial?: string;
  required?: boolean;
  max?: number;
  min?: string;
  helper?: string;
  showIf?: (values: Values) => boolean;
};
const advisorOptions: Option[] = Object.entries(ADVISORS).map(
  ([value, label]) => ({ value, label })
);
const assignedOptions = advisorOptions.filter((option) => option.value);
const clientOptions: Option[] = Object.entries(CLIENTS).map(
  ([value, label]) => ({ value, label })
);

function focusInvalid(form: HTMLFormElement, name: string): void {
  requestAnimationFrame(() => {
    const element = form.elements.namedItem(name);
    if (element instanceof HTMLElement) {
      element.focus();
    }
  });
}

function fieldError(field: FormField, value: string): string {
  if (field.required && !value.trim()) {
    return `${field.label} is required.`;
  }
  if (field.max && value.length > field.max) {
    return `Use ${field.max} characters or fewer.`;
  }
  if (field.type !== "date" || !value) {
    return "";
  }
  if (!isDate(value)) {
    return "Choose an exact calendar date.";
  }
  return field.min && value < field.min
    ? `Choose ${formatDate(field.min)} or later.`
    : "";
}

export function ActionForm({
  fields,
  onSubmit,
  submitLabel = "Save in demo",
  validate,
  children,
}: {
  fields: FormField[];
  onSubmit: (values: Values) => void;
  submitLabel?: string;
  validate?: (values: Values) => Values;
  children?: ReactNode | ((values: Values) => ReactNode);
}) {
  const { close } = useWorkspace();
  const prefix = useId();
  const initial = useRef(
    Object.fromEntries(fields.map((field) => [field.name, field.initial ?? ""]))
  );
  const [values, setValues] = useState<Values>(initial.current);
  const [errors, setErrors] = useState<Values>({});
  useDirty(
    Object.keys(values).some((key) => values[key] !== initial.current[key])
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Values = {};
    for (const field of fields.filter(
      (item) => !item.showIf || item.showIf(values)
    )) {
      const error = fieldError(field, values[field.name] ?? "");
      if (error) {
        nextErrors[field.name] = error;
      }
    }
    Object.assign(nextErrors, validate?.(values));
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) {
      focusInvalid(event.currentTarget, first);
      return;
    }
    onSubmit(values);
  };
  return (
    <form noValidate onSubmit={submit}>
      {fields
        .filter((field) => !field.showIf || field.showIf(values))
        .map((field) => {
          const id = `${prefix}-${field.name}`;
          const common = {
            id,
            name: field.name,
            value: values[field.name] ?? "",
            required: field.required,
            "aria-invalid": Boolean(errors[field.name]),
            "aria-describedby": errors[field.name]
              ? `${id}-error`
              : field.helper
                ? `${id}-helper`
                : undefined,
            onChange: (event: { target: { value: string } }) => {
              setValues((current) => ({
                ...current,
                [field.name]: event.target.value,
              }));
              setErrors((current) => ({ ...current, [field.name]: "" }));
            },
          };
          return (
            <div className="form-field" key={field.name}>
              <label htmlFor={id}>
                {field.label}
                {field.required && <span className="required-mark"> *</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea {...common} maxLength={field.max} rows={4} />
              ) : field.type === "select" ? (
                <select {...common}>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...common}
                  maxLength={field.max}
                  min={field.min}
                  type={field.type ?? "text"}
                />
              )}
              {field.helper && (
                <p className="helper" id={`${id}-helper`}>
                  {field.helper}
                </p>
              )}
              {errors[field.name] && (
                <p className="field-error" id={`${id}-error`} role="alert">
                  {errors[field.name]}
                </p>
              )}
            </div>
          );
        })}
      {typeof children === "function" ? children(values) : children}
      <div className="dialog-actions">
        <Button onClick={() => close()}>Cancel</Button>
        <Button primary type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function ClientMessageForm({
  recipients,
  section,
  initialText = "",
  needsFollowUp = false,
  recordLabel = "Record simulated message",
  advisory = false,
  onRecord,
}: {
  recipients: string[];
  section?: SectionId;
  initialText?: string;
  needsFollowUp?: boolean;
  recordLabel?: string;
  advisory?: boolean;
  onRecord: (text: string, followUp: string) => void;
}) {
  const { close } = useWorkspace();
  const id = useId();
  const [text, setText] = useState(initialText);
  const initialDate = needsFollowUp ? addDays(TODAY, 7) : "";
  const [followUp, setFollowUp] = useState(initialDate);
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Values>({});
  useDirty(text !== initialText || followUp !== initialDate);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Values = {};
    if (!text.trim() || text.trim().length > 2000) {
      next.message = "Enter a message of 1-2000 characters.";
    }
    if (needsFollowUp && (!isDate(followUp) || followUp < TODAY)) {
      next.followUp = "Choose a follow-up date on or after 18 Oct 2026.";
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      focusInvalid(event.currentTarget, first);
    } else {
      setPreview(true);
    }
  };
  return (
    <div>
      {advisory && (
        <p className="notice warning-notice">
          Draft for advisor review - not verified advice. Fictional policy
          example only.
        </p>
      )}
      <dl className="detail-list">
        <div>
          <dt>Recipient{recipients.length === 1 ? "" : "s"}</dt>
          <dd>{recipients.join(", ")}</dd>
        </div>
        {section && (
          <div>
            <dt>Related section</dt>
            <dd>{SECTIONS[section]}</dd>
          </div>
        )}
      </dl>
      {preview ? (
        <>
          <h3 className="subheading">Client-visible preview</h3>
          <div className="message-preview">
            <p>{text.trim()}</p>
            {needsFollowUp && (
              <p className="sub">Follow-up: {formatDate(followUp)}</p>
            )}
          </div>
          <p className="helper">
            Local simulation only. Nothing will be sent to an external service.
          </p>
          <div className="dialog-actions">
            <Button onClick={() => close()}>Cancel</Button>
            <Button onClick={() => setPreview(false)}>Back to edit</Button>
            <Button onClick={() => onRecord(text.trim(), followUp)} primary>
              {recordLabel}
            </Button>
          </div>
        </>
      ) : (
        <form noValidate onSubmit={submit}>
          <div className="form-field">
            <label htmlFor={`${id}-message`}>
              Client-visible message <span className="required-mark">*</span>
            </label>
            <textarea
              aria-describedby={
                errors.message ? `${id}-message-error` : undefined
              }
              aria-invalid={Boolean(errors.message)}
              id={`${id}-message`}
              maxLength={2000}
              name="message"
              onChange={(event) => {
                setText(event.target.value);
                setErrors((current) => ({ ...current, message: "" }));
              }}
              required
              rows={5}
              value={text}
            />
            {errors.message && (
              <p
                className="field-error"
                id={`${id}-message-error`}
                role="alert"
              >
                {errors.message}
              </p>
            )}
          </div>
          {needsFollowUp && (
            <div className="form-field">
              <label htmlFor={`${id}-date`}>
                Follow-up date <span className="required-mark">*</span>
              </label>
              <input
                aria-describedby={
                  errors.followUp ? `${id}-date-error` : undefined
                }
                aria-invalid={Boolean(errors.followUp)}
                id={`${id}-date`}
                min={TODAY}
                name="followUp"
                onChange={(event) => {
                  setFollowUp(event.target.value);
                  setErrors((current) => ({ ...current, followUp: "" }));
                }}
                required
                type="date"
                value={followUp}
              />
              {errors.followUp && (
                <p className="field-error" id={`${id}-date-error`} role="alert">
                  {errors.followUp}
                </p>
              )}
            </div>
          )}
          <p className="helper">
            Internal notes are not included. Preview and confirmation are
            required; nothing sends automatically.
          </p>
          <div className="dialog-actions">
            <Button onClick={() => close()}>Cancel</Button>
            <Button primary type="submit">
              Preview
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function NewCaseForm({ renewalCaseId }: { renewalCaseId?: string }) {
  const { demo, nav, change, replaceSurface, openCase, close } = useWorkspace();
  const renewal = demo.cases.find((record) => record.id === renewalCaseId);
  const people = [
    ...new Map(
      demo.cases
        .filter(
          (record) => nav.client === "all" || record.client === nav.client
        )
        .map((record) => [record.personId, record])
    ).values(),
  ];
  const [search, setSearch] = useState("");
  const [personId, setPersonId] = useState(renewal?.personId ?? "");
  const [route, setRoute] = useState(renewal?.route ?? "");
  const [country, setCountry] = useState<Country | "">(renewal?.country ?? "");
  const [advisor, setAdvisor] = useState<Advisor>(renewal?.advisor ?? "");
  const [reason, setReason] = useState<"New application" | "Renewal">(
    renewal ? "Renewal" : "New application"
  );
  const [duplicate, setDuplicate] = useState<CaseRecord | null>(null);
  const [errors, setErrors] = useState<Values>({});
  const person = people.find((record) => record.personId === personId);
  const routes = [...new Set(demo.cases.map((record) => record.route))].sort();
  useDirty(
    personId !== (renewal?.personId ?? "") ||
      route !== (renewal?.route ?? "") ||
      country !== (renewal?.country ?? "") ||
      advisor !== (renewal?.advisor ?? "") ||
      reason !== (renewal ? "Renewal" : "New application")
  );
  const create = () => {
    if (!(person && country && route)) {
      return;
    }
    const next = change(
      { type: "new-case", personId, route, country, advisor, reason },
      "Demo draft created. Application remains Not filed."
    );
    const record = next?.cases.at(-1);
    if (record) {
      replaceSurface(
        { kind: "case", caseId: record.id, tab: "overview" },
        true
      );
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Values = {};
    if (!person) {
      next.person = "Select an existing person.";
    }
    if (!route) {
      next.route = "Choose a route.";
    }
    if (!country) {
      next.country = "Choose a country.";
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      focusInvalid(event.currentTarget, first);
      return;
    }
    const existing = demo.cases.find(
      (record) =>
        !record.closed &&
        record.personId === personId &&
        record.route === route &&
        record.country === country
    );
    if (existing) {
      setDuplicate(existing);
    } else {
      create();
    }
  };
  if (duplicate) {
    return (
      <>
        <p className="notice warning-notice">
          An active case already exists for this person, route, and country.
          Cases will not be merged.
        </p>
        <h3>
          {duplicate.id} · {duplicate.name}
        </h3>
        <p>
          {duplicate.route} / {COUNTRIES[duplicate.country]} · {duplicate.stage}
        </p>
        <div className="dialog-actions">
          <Button onClick={() => setDuplicate(null)}>Back to draft</Button>
          <Button onClick={() => close()}>Cancel</Button>
          <Button onClick={() => openCase(duplicate.id)}>Open existing</Button>
          <Button onClick={create} primary>
            Create separate draft
          </Button>
        </div>
      </>
    );
  }
  return (
    <form noValidate onSubmit={submit}>
      <p className="notice">
        Create a local draft linked to an existing person. This does not submit
        or file an application.
      </p>
      <div className="form-field">
        <label htmlFor="new-person-search">Find existing person</label>
        <input
          id="new-person-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search within the current client scope"
          type="search"
          value={search}
        />
      </div>
      <div className="form-field">
        <label htmlFor="new-person">
          Existing person <span className="required-mark">*</span>
        </label>
        <select
          aria-invalid={Boolean(errors.person)}
          id="new-person"
          name="person"
          onChange={(event) => setPersonId(event.target.value)}
          value={personId}
        >
          <option value="">Select a person</option>
          {people
            .filter(
              (record) =>
                record.personId === personId ||
                `${record.name} ${CLIENTS[record.client]}`
                  .toLowerCase()
                  .includes(search.toLowerCase())
            )
            .map((record) => (
              <option key={record.personId} value={record.personId}>
                {record.name} · {CLIENTS[record.client]}
              </option>
            ))}
        </select>
        {errors.person && (
          <p className="field-error" role="alert">
            {errors.person}
          </p>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="new-employer">Employer</label>
        <input
          id="new-employer"
          readOnly
          value={person ? CLIENTS[person.client] : "Select an existing person"}
        />
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="new-route">
            Route <span className="required-mark">*</span>
          </label>
          <select
            aria-invalid={Boolean(errors.route)}
            id="new-route"
            name="route"
            onChange={(event) => setRoute(event.target.value)}
            value={route}
          >
            <option value="">Select route</option>
            {routes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          {errors.route && (
            <p className="field-error" role="alert">
              {errors.route}
            </p>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="new-country">
            Country <span className="required-mark">*</span>
          </label>
          <select
            aria-invalid={Boolean(errors.country)}
            id="new-country"
            name="country"
            onChange={(event) => setCountry(event.target.value as Country | "")}
            value={country}
          >
            <option value="">Select country</option>
            {Object.entries(COUNTRIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.country && (
            <p className="field-error" role="alert">
              {errors.country}
            </p>
          )}
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="new-advisor">Assigned advisor (optional)</label>
        <select
          id="new-advisor"
          onChange={(event) => setAdvisor(event.target.value as Advisor)}
          value={advisor}
        >
          {advisorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="new-reason">Reason</label>
        <select
          id="new-reason"
          onChange={(event) =>
            setReason(event.target.value as "New application" | "Renewal")
          }
          value={reason}
        >
          <option>New application</option>
          <option>Renewal</option>
        </select>
      </div>
      <div className="dialog-actions">
        <Button onClick={() => close()}>Cancel</Button>
        <Button primary type="submit">
          Create demo draft
        </Button>
      </div>
    </form>
  );
}

export function WorkflowForm({ surface }: { surface: Surface }) {
  switch (surface.kind) {
    case "compose":
    case "assign":
    case "deadline":
    case "action":
      return <CaseWorkflowForm surface={surface} />;
    case "verify":
      return <VerificationForm obligationId={surface.obligationId} />;
    default:
      return <SupportingWorkflowForm surface={surface} />;
  }
}

function SupportingWorkflowForm({ surface }: { surface: Surface }) {
  const { demo, nav, change, close, saveView } = useWorkspace();
  if (surface.kind === "new") {
    return <NewCaseForm renewalCaseId={surface.renewalCaseId} />;
  }
  if (surface.kind === "save-view") {
    return (
      <ActionForm
        fields={[{ name: "name", label: "View name", required: true, max: 40 }]}
        onSubmit={(values) => {
          saveView(values.name.trim());
          close(true);
        }}
        submitLabel="Save view"
      />
    );
  }
  if (surface.kind === "policy-tasks") {
    const includesUnassigned = surface.caseIds.some(
      (id) => !demo.cases.find((record) => record.id === id)?.advisor
    );
    return (
      <>
        <p>
          {surface.caseIds.length} selected cases. One internal review task per
          case; no policy or application decisions are made.
        </p>
        <ActionForm
          fields={[
            {
              name: "title",
              label: "Task title",
              initial: "Assess fictional work visa guidance",
              required: true,
              max: 200,
            },
            {
              name: "advisor",
              label: "Task owner",
              initial: "case",
              type: "select",
              options: [
                { value: "case", label: "Each case's assigned advisor" },
                ...assignedOptions,
              ],
            },
            {
              name: "date",
              label: "Target date",
              initial: addDays(TODAY, 7),
              required: true,
              type: "date",
            },
          ]}
          onSubmit={(values) => {
            if (
              change(
                {
                  type: "policy-tasks",
                  caseIds: surface.caseIds,
                  title: values.title,
                  advisor: values.advisor as Advisor | "case",
                  date: values.date,
                },
                "Review tasks saved in demo."
              )
            ) {
              close(true);
            }
          }}
          submitLabel="Confirm"
          validate={(values): Values =>
            includesUnassigned && values.advisor === "case"
              ? {
                  advisor:
                    "An unassigned case is selected. Choose an explicit task owner.",
                }
              : {}
          }
        />
      </>
    );
  }
  if (surface.kind === "policy-message") {
    return (
      <ClientMessageForm
        advisory
        initialText="We are reviewing a fictional work visa guidance update and assessing whether it affects your case. This demo draft is for advisor review and is not verified advice."
        onRecord={(text) => {
          if (
            change(
              { type: "policy-message", caseIds: surface.caseIds, text },
              "Simulated messages recorded; nothing sent."
            )
          ) {
            close(true);
          }
        }}
        recipients={surface.caseIds.flatMap((id) => {
          const record = demo.cases.find((item) => item.id === id);
          return record ? [`${record.name} (${emailFor(record)})`] : [];
        })}
        recordLabel="Record simulated messages"
      />
    );
  }
  if (surface.kind === "planning") {
    const item = demo.obligations.find(
      (entry) => entry.id === surface.obligationId
    );
    const clients = clientOptions.filter(
      (option) => nav.client === "all" || option.value === nav.client
    );
    const client =
      item?.client ??
      surface.clientId ??
      (nav.client === "all" ? "KR" : nav.client);
    return (
      <>
        <p className="notice">
          Internal planning only. This is not a verified statutory deadline.
        </p>
        <ActionForm
          fields={[
            {
              name: "title",
              label: "Title",
              initial: item?.title,
              required: true,
              max: 200,
            },
            {
              name: "client",
              label: "Employer",
              type: "select",
              initial: client,
              options: clients,
            },
            {
              name: "advisor",
              label: "Owner advisor",
              type: "select",
              initial: item?.advisor ?? "AS",
              required: true,
              options: assignedOptions,
            },
            {
              name: "date",
              label: "Date",
              type: "date",
              initial: item?.date ?? "",
              required: true,
            },
            {
              name: "type",
              label: "Type",
              type: "select",
              initial: item?.type ?? "Employer",
              options: ["Internal", "Follow-up", "Employer"].map((value) => ({
                value,
                label:
                  value === "Employer" ? "Employer - internal planning" : value,
              })),
            },
            {
              name: "source",
              label: "Source note (optional)",
              initial: item?.source,
              type: "textarea",
              max: 200,
            },
          ]}
          onSubmit={(values) => {
            if (
              change(
                {
                  type: "planning",
                  obligationId: item?.id,
                  caseId: item?.caseId,
                  title: values.title,
                  client: values.client as ClientId,
                  advisor: values.advisor as Advisor,
                  date: values.date,
                  obligationType: values.type as
                    | "Internal"
                    | "Follow-up"
                    | "Employer",
                  source: values.source,
                },
                "Planning obligation saved in demo."
              )
            ) {
              close(true);
            }
          }}
        />
      </>
    );
  }
  return <Empty title="This form was not found" />;
}

function VerificationForm({ obligationId }: { obligationId: string }) {
  const { demo, open, change, close } = useWorkspace();
  const item = demo.obligations.find((entry) => entry.id === obligationId);
  const record = demo.cases.find((entry) => entry.id === item?.caseId);
  if (!(item && record)) {
    return <Empty title="This recorded date was not found" />;
  }
  return (
    <>
      <div className="person-summary">
        <h3>{record.name}</h3>
        <p className="sub">
          {CLIENTS[item.client]} · {record.id} · {record.route}
        </p>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Recorded date</dt>
          <dd>{formatDate(item.date)}</dd>
        </div>
        <div>
          <dt>Last verification</dt>
          <dd>
            {item.verification
              ? `${formatDate(item.verification.date)} · ${item.verification.actor} · ${item.verification.outcome}`
              : "Not recorded"}
          </dd>
        </div>
        <div>
          <dt>Linked cases</dt>
          <dd>
            {demo.cases
              .filter((entry) => entry.personId === record.personId)
              .map((entry) => (
                <LinkButton
                  key={entry.id}
                  onClick={() =>
                    open({ kind: "case", caseId: entry.id, tab: "overview" })
                  }
                >
                  {entry.id} · {entry.route}
                </LinkButton>
              ))}
          </dd>
        </div>
      </dl>
      <p className="notice">
        Verification records an administrative check. It never determines
        whether a person has work rights.
      </p>
      <ActionForm
        fields={[
          {
            name: "source",
            label: "Source note",
            initial: item.verification?.source,
            required: true,
            max: 200,
            type: "textarea",
          },
          {
            name: "outcome",
            label: "Outcome",
            initial: item.verification?.outcome ?? "",
            required: true,
            type: "select",
            options: [
              { value: "", label: "Select outcome" },
              { value: "Needs follow-up", label: "Needs follow-up" },
              {
                value: "Updated record checked",
                label: "Updated record checked",
              },
            ],
          },
          {
            name: "replacement",
            label: "Replacement recorded date (optional)",
            type: "date",
            helper:
              "Leave blank to retain the recorded date and its place in the compliance lists.",
          },
        ]}
        onSubmit={(values) => {
          if (
            change(
              {
                type: "verify",
                obligationId: item.id,
                source: values.source,
                outcome: values.outcome as
                  | "Needs follow-up"
                  | "Updated record checked",
                replacement: values.replacement,
              },
              "Verification saved in demo. No legal-status determination made."
            )
          ) {
            close(true);
          }
        }}
        submitLabel="Save verification"
      />
      <Button
        className="rail-link"
        onClick={() => open({ kind: "new", renewalCaseId: record.id })}
      >
        Start renewal planning
      </Button>
    </>
  );
}

function CaseWorkflowForm({
  surface,
}: {
  surface: Extract<
    Surface,
    { kind: "compose" | "assign" | "deadline" | "action" }
  >;
}) {
  const { demo, change, close } = useWorkspace();
  const record = demo.cases.find((entry) => entry.id === surface.caseId);
  if (!record) {
    return <Empty title="This demo case was not found" />;
  }
  if (surface.kind === "compose") {
    return (
      <>
        <p className="sub form-context">
          {record.name} · {record.id}
          {surface.field ? ` · ${surface.field}` : ""}
        </p>
        <ClientMessageForm
          initialText={surface.text}
          needsFollowUp
          onRecord={(text, followUp) => {
            if (
              change(
                {
                  type: "request",
                  caseId: record.id,
                  section: surface.section,
                  field: surface.field,
                  text,
                  followUp,
                },
                "Simulated request recorded; nothing sent."
              )
            ) {
              close(true);
            }
          }}
          recipients={[emailFor(record)]}
          recordLabel="Record simulated request"
          section={surface.section}
        />
      </>
    );
  }
  if (surface.kind === "assign") {
    return (
      <>
        <p className="form-context">
          {record.id} · {record.name}
        </p>
        <ActionForm
          fields={[
            {
              name: "advisor",
              label: "Assigned advisor",
              type: "select",
              initial: record.advisor,
              options: advisorOptions,
            },
          ]}
          onSubmit={(values) => {
            if (
              change(
                {
                  type: "assign",
                  caseId: record.id,
                  advisor: values.advisor as Advisor,
                },
                "Advisor assignment saved in demo."
              )
            ) {
              close(true);
            }
          }}
        />
      </>
    );
  }
  if (surface.kind === "deadline") {
    const task = demo.obligations.find(
      (item) => item.caseId === record.id && item.type === "Government"
    );
    return (
      <>
        <p className="form-context">
          {record.name} · Evidence response · Government deadline
        </p>
        <ActionForm
          fields={[
            {
              name: "date",
              label: "Government response deadline",
              type: "date",
              initial: task?.date ?? "",
              required: true,
            },
            {
              name: "source",
              label: "Source note",
              type: "textarea",
              max: 200,
              required: true,
              initial: task?.date ? task.source : "",
              helper:
                "Record the fictional notice or source used for this exact date.",
            },
          ]}
          onSubmit={(values) => {
            if (
              change(
                {
                  type: "deadline",
                  caseId: record.id,
                  date: values.date,
                  source: values.source,
                },
                "Government response deadline saved in demo. Evidence response still needs preparation."
              )
            ) {
              close(true);
            }
          }}
        />
      </>
    );
  }
  return <NextActionForm record={record} taskId={surface.taskId} />;
}

function NextActionForm({
  record,
  taskId,
}: {
  record: CaseRecord;
  taskId?: string;
}) {
  const { demo, change, close } = useWorkspace();
  const task = demo.obligations.find((item) => item.id === taskId);
  return (
    <>
      <p className="form-context">
        {record.id} · {record.name}
      </p>
      <ActionForm
        fields={[
          {
            name: "title",
            label: "Next action",
            required: true,
            max: 200,
            initial: task && !task.urgent ? task.title : "",
          },
          {
            name: "owner",
            label: "Waiting on / owner",
            type: "select",
            initial: task?.owner ?? "Advisor",
            options: ["Advisor", "Client", "Employer", "Authority"].map(
              (value) => ({ value, label: value })
            ),
          },
          {
            name: "advisor",
            label: "Assignee advisor",
            type: "select",
            initial: task?.advisor ?? record.advisor,
            options: advisorOptions,
            showIf: (values) => values.owner === "Advisor",
          },
          {
            name: "date",
            label: task?.requestId
              ? "Request follow-up date"
              : "Due date (optional)",
            type: "date",
            required: Boolean(task?.requestId),
            initial: task?.date ?? "",
          },
          {
            name: "type",
            label: "Deadline type",
            type: "select",
            initial: task?.type === "Follow-up" ? "Follow-up" : "Internal",
            options: task?.requestId
              ? [{ value: "Follow-up", label: "Follow-up" }]
              : [
                  { value: "Internal", label: "Internal target" },
                  { value: "Follow-up", label: "Follow-up" },
                ],
          },
        ]}
        onSubmit={(values) => {
          if (
            change(
              {
                type: "next-action",
                caseId: record.id,
                taskId: task?.id,
                title: values.title,
                owner: values.owner as Owner,
                advisor: values.advisor as Advisor,
                date: values.date,
                obligationType: values.type as "Internal" | "Follow-up",
              },
              "Next action saved in demo."
            )
          ) {
            close(true);
          }
        }}
        validate={(values): Values =>
          values.owner === "Advisor" && !values.advisor
            ? { advisor: "Select an advisor to own this action." }
            : {}
        }
      />
    </>
  );
}
