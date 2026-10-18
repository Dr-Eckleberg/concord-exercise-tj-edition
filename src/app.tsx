import { useEffect, useMemo, useState } from "react";
import { Card } from "./components/card";
import { loadEmployees } from "./data/load-employees";
import {
  advisorOptions,
  compareWithoutVisa,
  compareWithVisa,
  type ExpiryState,
  expiryState,
  hasVisa,
  isActionable,
  matchesAdvisor,
  normaliseProfileStatus,
  type Row,
  UNASSIGNED,
} from "./data/prioritise";

// TODO: data issues spotted but not fixed here —
// - EMP-1001 and EMP-1028 are the same person (Wei Chen); needs a person/case split in the model.
// - One row (Pieter de Vries) has no employee_id; we fall back to a synthetic React key.
// - filed_at mixes DD/MM and MM/DD (e.g. EMP-1003 "04/22/2026"); needs per-source parsing.
// - EMP-1013 is Denied but has a granted_at date.

type View = "without" | "with";

const EXPIRY_LABEL: Record<ExpiryState, string> = {
  expired: "Expired",
  "expiring-soon": "Expiring soon",
  ok: "Valid",
  unknown: "No expiry",
};

const PROFILE_LABEL = {
  completed: "Completed",
  "in progress": "In Progress",
  "not started": "Not Started",
} as const;

function rowKey(row: Row, index: number): string {
  return row.employee_id || `row-${index}-${row.email || row.full_name}`;
}

function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [view, setView] = useState<View>("without");
  const [advisor, setAdvisor] = useState("");

  useEffect(() => {
    loadEmployees().then(setRows);
  }, []);

  const advisors = useMemo(() => advisorOptions(rows), [rows]);
  const filtered = useMemo(
    () => rows.filter((r) => matchesAdvisor(r, advisor)),
    [rows, advisor]
  );
  const withoutVisa = useMemo(
    () => filtered.filter((r) => !hasVisa(r)).sort(compareWithoutVisa),
    [filtered]
  );
  const withVisa = useMemo(
    () => filtered.filter(hasVisa).sort(compareWithVisa),
    [filtered]
  );
  const actionableCount = withoutVisa.filter(isActionable).length;
  const expiringCount = withVisa.filter((r) => {
    const state = expiryState(r);
    return state === "expired" || state === "expiring-soon";
  }).length;

  return (
    <div className="page">
      <h1>Visa Tracking</h1>
      <p className="subtitle">Kowhai Robotics — HR dashboard</p>

      <div className="cards">
        <Card label="Employees" value={filtered.length} />
        <Card label="Action needed" value={actionableCount} />
        <Card label="Expired / expiring soon" value={expiringCount} />
      </div>

      <div className="toolbar">
        <div className="toggle">
          <button
            aria-pressed={view === "without"}
            className={view === "without" ? "active" : ""}
            onClick={() => setView("without")}
            type="button"
          >
            Without visa ({withoutVisa.length})
          </button>
          <button
            aria-pressed={view === "with"}
            className={view === "with" ? "active" : ""}
            onClick={() => setView("with")}
            type="button"
          >
            With visa ({withVisa.length})
          </button>
        </div>

        <label className="filter">
          Advisor{" "}
          <select onChange={(e) => setAdvisor(e.target.value)} value={advisor}>
            <option value="">All advisors</option>
            {advisors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value={UNASSIGNED}>Unassigned</option>
          </select>
        </label>
      </div>

      {view === "without" ? (
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>ID</th>
              <th>Name</th>
              <th>Visa</th>
              <th>Profile</th>
              <th>Case status</th>
              <th>Completion</th>
              <th>Advisor</th>
            </tr>
          </thead>
          <tbody>
            {withoutVisa.map((row, i) => {
              const actionable = isActionable(row);
              return (
                <tr
                  className={actionable ? "row-actionable" : ""}
                  key={rowKey(row, i)}
                >
                  <td>
                    {actionable && (
                      <span className="badge badge-action">Action needed</span>
                    )}
                  </td>
                  <td>{row.employee_id || "—"}</td>
                  <td>{row.full_name}</td>
                  <td>{row.visa_type}</td>
                  <td>
                    {PROFILE_LABEL[normaliseProfileStatus(row.profile_status)]}
                  </td>
                  <td>{row.case_status || "Not Filed"}</td>
                  <td>
                    {row.profile_completion_pct
                      ? `${row.profile_completion_pct}%`
                      : "—"}
                  </td>
                  <td>{row.assigned_advisor || "Unassigned"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Expiry</th>
              <th>ID</th>
              <th>Name</th>
              <th>Visa</th>
              <th>Expires</th>
              <th>Advisor</th>
            </tr>
          </thead>
          <tbody>
            {withVisa.map((row, i) => {
              const state = expiryState(row);
              return (
                <tr className={`row-${state}`} key={rowKey(row, i)}>
                  <td>
                    <span className={`badge badge-${state}`}>
                      {EXPIRY_LABEL[state]}
                    </span>
                  </td>
                  <td>{row.employee_id || "—"}</td>
                  <td>{row.full_name}</td>
                  <td>{row.visa_type}</td>
                  <td>{row.expires_at || "—"}</td>
                  <td>{row.assigned_advisor || "Unassigned"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
