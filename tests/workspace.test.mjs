import assert from "node:assert/strict";
import test from "node:test";
import {
  ADVISORS,
  addDays,
  applyAction,
  approvalBlockers,
  complianceCounts,
  createDemo,
  DemoError,
  daysFromToday,
  emailFor,
  formatDate,
  isDate,
  matchesCategory,
  needsVerification,
  nextAction,
  nextDeadline,
  obligationsInScope,
  POLICY_ID,
  pendingSections,
  queueCases,
  requestsFor,
  reviewCode,
  sectionIds,
  TODAY,
} from "../src/data/workspace.ts";

function getCase(state, id) {
  const record = state.cases.find((item) => item.id === id);
  assert.ok(record, `Expected case ${id}`);
  return record;
}

function totals(state, client = "all", advisor = "all") {
  return ["urgent", "review", "waiting", "ready"].map(
    (queue) => queueCases(state, queue, client, advisor).length
  );
}

function reviewAll(state, caseId) {
  let next = state;
  for (const section of sectionIds()) {
    next = applyAction(next, {
      type: "review",
      caseId,
      section,
      checks: getCase(next, caseId).sections[section].checks.map(() => true),
    });
  }
  return next;
}

function approveIsabella() {
  let state = reviewAll(createDemo(), "C01");
  const request = requestsFor(state, "C01")[0];
  state = applyAction(state, {
    type: "resolve-request",
    requestId: request.id,
  });
  return applyAction(state, { type: "approve", caseId: "C01" });
}

test("initial fixtures have 25 cases, 24 people, and independent active monitoring cases", () => {
  const state = createDemo();
  assert.equal(state.cases.length, 25);
  assert.equal(new Set(state.cases.map((item) => item.personId)).size, 24);
  assert.equal(state.cases.filter((item) => !item.closed).length, 22);
  assert.equal(
    state.cases.filter((item) => !item.closed && item.stage === "Approved")
      .length,
    9
  );
  assert.deepEqual(totals(state), [2, 3, 4, 2]);
  assert.equal(getCase(state, "C10").personId, getCase(state, "C25").personId);
  assert.equal(emailFor(getCase(state, "C10")), "wei@example.test");
  assert.equal(emailFor(getCase(state, "C25")), "wei@example.test");
  assert.equal(emailFor(getCase(state, "C04")), "minh@example.test");
});

test("all work queues respect client and advisor scope without changing ownership", () => {
  const state = createDemo();
  assert.deepEqual(totals(state, "KR", "AS"), [2, 1, 0, 0]);
  assert.deepEqual(totals(state, "KR", "JP"), [0, 0, 2, 0]);
  assert.deepEqual(totals(state, "TB"), [0, 2, 1, 0]);
  assert.deepEqual(totals(state, "SC"), [0, 0, 0, 2]);
  assert.equal(getCase(state, "C09").advisor, "ML");
});

test("compliance metrics and relative dates use the exact fixed calendar reference", () => {
  const state = createDemo();
  assert.deepEqual(complianceCounts(state.obligations), {
    past: 6,
    upcoming: 4,
    passport: 1,
    employer: 3,
  });
  assert.deepEqual(
    ["2026-12-31", "2027-01-09", "2027-02-01", "2027-02-14", "2027-03-15"].map(
      daysFromToday
    ),
    [74, 83, 106, 119, 148]
  );
  assert.deepEqual(complianceCounts(obligationsInScope(state, "KR", "AS")), {
    past: 1,
    upcoming: 1,
    passport: 0,
    employer: 1,
  });
  assert.equal(formatDate(TODAY), "18 Oct 2026");
  assert.equal(formatDate(null), "Not recorded");
});

test("date validation rejects ambiguous and invalid dates and handles calendar boundaries", () => {
  assert.equal(isDate("09/01/2027"), false);
  assert.equal(isDate("2026-02-30"), false);
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("2028-02-29"), true);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays(TODAY, 120), "2027-02-15");
});

test("section checks do not resolve requests or imply profile approval", () => {
  let state = createDemo();
  assert.equal(approvalBlockers(state, getCase(state, "C01")).length, 3);
  assert.throws(
    () =>
      applyAction(state, {
        type: "resolve-request",
        requestId: requestsFor(state, "C01")[0].id,
      }),
    DemoError
  );
  state = applyAction(state, {
    type: "review",
    caseId: "C01",
    section: "employment",
    checks: [true, true, true],
  });
  assert.equal(requestsFor(state, "C01")[0].status, "Client replied");
  assert.equal(approvalBlockers(state, getCase(state, "C01")).length, 2);
  assert.throws(
    () => applyAction(state, { type: "approve", caseId: "C01" }),
    DemoError
  );
});

test("explicit approval records actor/version/date, moves queues, and never files", () => {
  const state = approveIsabella();
  const record = getCase(state, "C01");
  assert.equal(reviewCode(state, record), "P");
  assert.equal(record.stage, "Not filed");
  assert.equal(record.version, 3);
  assert.equal(record.approval.actor, "A. Singh");
  assert.equal(record.approval.date, TODAY);
  assert.equal(record.approval.version, 3);
  assert.deepEqual(totals(state), [2, 2, 4, 3]);
  assert.throws(
    () => applyAction(state, { type: "approve", caseId: "C01" }),
    DemoError
  );
});

test("incomplete information blocks approval even after every section is reviewed", () => {
  const state = reviewAll(createDemo(), "C03");
  assert.equal(pendingSections(getCase(state, "C03")).length, 0);
  assert.ok(
    approvalBlockers(state, getCase(state, "C03")).includes(
      "Information is incomplete"
    )
  );
  assert.throws(
    () => applyAction(state, { type: "approve", caseId: "C03" }),
    DemoError
  );
});

test("unassigned cases require an advisor and assignment resolves administrative verification", () => {
  let state = createDemo();
  getCase(state, "C05").supplied = 100;
  state = reviewAll(state, "C05");
  assert.equal(needsVerification(state, getCase(state, "C05")), true);
  assert.throws(
    () => applyAction(state, { type: "approve", caseId: "C05" }),
    DemoError
  );
  state = applyAction(state, { type: "assign", caseId: "C05", advisor: "AS" });
  assert.equal(needsVerification(state, getCase(state, "C05")), false);
  state = applyAction(state, { type: "approve", caseId: "C05" });
  assert.equal(reviewCode(state, getCase(state, "C05")), "P");
});

test("a new clarification invalidates approval but preserves completed section decisions", () => {
  let state = approveIsabella();
  state = applyAction(state, {
    type: "request",
    caseId: "C01",
    section: "employment",
    text: "Please clarify the revised responsibilities.",
    followUp: "2026-10-23",
  });
  const record = getCase(state, "C01");
  assert.equal(record.approval, undefined);
  assert.equal(record.sections.employment.reviewedVersion, 3);
  assert.equal(reviewCode(state, record), "C");
  assert.equal(record.stage, "Not filed");
  assert.deepEqual(totals(state), [2, 2, 5, 2]);
  assert.equal(
    state.obligations.filter(
      (item) => item.caseId === "C01" && item.requestId && !item.complete
    ).length,
    1
  );
});

test("material updates increment only the client version and retain unaffected review versions", () => {
  let state = approveIsabella();
  state = applyAction(state, {
    type: "simulate",
    caseId: "C01",
    section: "employment",
  });
  const record = getCase(state, "C01");
  assert.equal(record.version, 4);
  assert.equal(record.approval, undefined);
  assert.equal(record.sections.employment.reviewedVersion, null);
  assert.equal(record.sections.personal.reviewedVersion, 3);
  assert.ok(
    record.sections.employment.fields.at(-1).value.endsWith("[Updated in demo]")
  );
  assert.equal(record.stage, "Not filed");
  assert.equal(reviewCode(state, record), "U");
});

test("replied requests remain unresolved and unanswered requests keep the case waiting", () => {
  let state = createDemo();
  state = applyAction(state, {
    type: "request",
    caseId: "C03",
    section: "employment",
    text: "Confirm role.",
    followUp: TODAY,
  });
  state = applyAction(state, {
    type: "simulate",
    caseId: "C03",
    section: "personal",
  });
  assert.equal(getCase(state, "C03").supplied, 65);
  assert.equal(reviewCode(state, getCase(state, "C03")), "C");
  state = applyAction(state, {
    type: "simulate",
    caseId: "C03",
    section: "employment",
  });
  assert.equal(reviewCode(state, getCase(state, "C03")), "U");
  assert.equal(
    requestsFor(state, "C03").filter((item) => item.status !== "Resolved")
      .length,
    2
  );
});

test("reopening a resolved request creates its follow-up and invalidates approval", () => {
  let state = approveIsabella();
  const id = requestsFor(state, "C01")[0].id;
  state = applyAction(state, { type: "reopen-request", requestId: id });
  assert.equal(reviewCode(state, getCase(state, "C01")), "C");
  assert.ok(
    state.obligations.some((item) => item.requestId === id && !item.complete)
  );
  assert.equal(getCase(state, "C01").approval, undefined);
});

test("internal notes never enter client-visible request or reminder content", () => {
  let state = createDemo();
  state = applyAction(state, {
    type: "note",
    caseId: "C01",
    section: "employment",
    text: "INTERNAL ONLY assessment.",
  });
  const request = requestsFor(state, "C01")[0];
  state = applyAction(state, {
    type: "message",
    requestId: request.id,
    text: "Please reply when ready.",
  });
  assert.equal(requestsFor(state, "C01")[0].status, "Client replied");
  assert.equal(
    requestsFor(state, "C01")[0].messages.at(-1).text,
    "Please reply when ready."
  );
  assert.equal(
    state.history.some(
      (entry) =>
        entry.visibility === "Client-visible" &&
        entry.detail.includes("INTERNAL ONLY")
    ),
    false
  );
  assert.equal(requestsFor(state, "C01")[0].reminderDate, TODAY);
});

test("preparation removes only the ready work item and preserves approval and Not filed", () => {
  let state = createDemo();
  state = applyAction(state, { type: "prepare", caseId: "C04" });
  const record = getCase(state, "C04");
  assert.equal(record.preparation, true);
  assert.equal(record.stage, "Not filed");
  assert.equal(reviewCode(state, record), "P");
  assert.deepEqual(totals(state), [2, 3, 4, 1]);
  assert.throws(
    () => applyAction(state, { type: "prepare", caseId: "C04" }),
    DemoError
  );
});

test("recording an evidence deadline clears verification but urgent response work remains", () => {
  let state = createDemo();
  state = applyAction(state, {
    type: "deadline",
    caseId: "C02",
    date: "2026-10-28",
    source: "Fictional evidence notice",
  });
  const record = getCase(state, "C02");
  assert.equal(needsVerification(state, record), false);
  assert.equal(nextDeadline(state, record).date, "2026-10-28");
  assert.deepEqual(totals(state), [2, 3, 4, 2]);
  assert.equal(nextAction(state, record).title, "Prepare evidence response");
  state = applyAction(state, {
    type: "complete",
    obligationId: "T02",
    complete: true,
  });
  assert.deepEqual(totals(state), [1, 3, 4, 2]);
  assert.equal(getCase(state, "C02").stage, "Evidence requested");
  assert.equal(nextDeadline(state, getCase(state, "C02")), undefined);
});

test("a C07 next action completes its urgent item and editing does not duplicate dates", () => {
  let state = createDemo();
  const action = {
    type: "next-action",
    caseId: "C07",
    taskId: "T07",
    title: "Review the next milestone",
    owner: "Advisor",
    advisor: "AS",
    date: "2026-10-25",
    obligationType: "Internal",
  };
  state = applyAction(state, action);
  const record = getCase(state, "C07");
  const length = state.obligations.length;
  assert.deepEqual(totals(state), [1, 3, 4, 2]);
  assert.equal(
    state.obligations.find((item) => item.id === "T07").complete,
    true
  );
  assert.equal(nextAction(state, record).title, action.title);
  state = applyAction(state, {
    ...action,
    taskId: record.actionTaskId,
    date: "2026-10-26",
  });
  assert.equal(state.obligations.length, length);
  assert.equal(nextDeadline(state, getCase(state, "C07")).date, "2026-10-26");
});

test("assignment updates inherited task ownership without erasing historical approval", () => {
  let state = createDemo();
  state = applyAction(state, { type: "assign", caseId: "C06", advisor: "JP" });
  assert.equal(
    state.obligations.find((item) => item.id === "I1").advisor,
    "JP"
  );
  const approval = getCase(state, "C04").approval;
  state = applyAction(state, { type: "assign", caseId: "C04", advisor: "AS" });
  assert.deepEqual(getCase(state, "C04").approval, approval);
  assert.equal(approval.actor, ADVISORS.JP);
});

test("verification of an unchanged past date keeps the count; corrections recompute it", () => {
  let state = createDemo();
  const action = {
    type: "verify",
    obligationId: "V-C14",
    source: "Fictional record checked",
    outcome: "Needs follow-up",
    replacement: "",
  };
  state = applyAction(state, action);
  assert.equal(complianceCounts(state.obligations).past, 6);
  assert.equal(
    state.obligations.find((item) => item.id === "V-C14").verification.outcome,
    "Needs follow-up"
  );
  state = applyAction(state, {
    ...action,
    outcome: "Updated record checked",
    replacement: "2026-11-01",
  });
  assert.equal(complianceCounts(state.obligations).past, 5);
  assert.equal(complianceCounts(state.obligations).upcoming, 5);
  assert.ok(state.history.at(-1).detail.includes("1 Dec 2025"));
  assert.ok(state.history.at(-1).detail.includes("1 Nov 2026"));
});

test("employer planning add, edit, completion, and reopening share one obligation", () => {
  let state = createDemo();
  const action = {
    type: "planning",
    client: "KR",
    title: "Quarterly planning check",
    advisor: "AS",
    date: "2026-10-27",
    obligationType: "Employer",
    source: "Internal demo planning",
  };
  state = applyAction(state, action);
  const item = state.obligations.at(-1);
  const length = state.obligations.length;
  assert.equal(complianceCounts(state.obligations).employer, 4);
  state = applyAction(state, {
    ...action,
    obligationId: item.id,
    date: "2026-10-29",
  });
  assert.equal(state.obligations.length, length);
  state = applyAction(state, {
    type: "complete",
    obligationId: item.id,
    complete: true,
  });
  assert.equal(complianceCounts(state.obligations).employer, 3);
  state = applyAction(state, {
    type: "complete",
    obligationId: item.id,
    complete: false,
  });
  assert.equal(complianceCounts(state.obligations).employer, 4);
});

test("policy tasks require explicit unassigned ownership and prevent case-policy duplicates", () => {
  let state = createDemo();
  const action = {
    type: "policy-tasks",
    caseIds: ["C03", "C05"],
    title: "Review fictional guidance",
    advisor: "case",
    date: "2026-10-27",
  };
  assert.throws(() => applyAction(state, action), DemoError);
  assert.equal(
    state.obligations.some((item) => item.policyId),
    false
  );
  state = applyAction(state, { ...action, advisor: "AS" });
  assert.equal(
    state.obligations.filter((item) => item.policyId === POLICY_ID).length,
    2
  );
  state = applyAction(state, { ...action, advisor: "AS" });
  assert.equal(
    state.obligations.filter((item) => item.policyId === POLICY_ID).length,
    2
  );
  assert.deepEqual(totals(state), [2, 3, 4, 2]);
});

test("new drafts link to existing people without merging cases or creating tasks", () => {
  const initial = createDemo();
  const state = applyAction(initial, {
    type: "new-case",
    personId: "person-C10",
    route: "H-1B",
    country: "US",
    advisor: "JP",
    reason: "Renewal",
  });
  const record = getCase(state, "C26");
  assert.equal(state.cases.length, 26);
  assert.equal(new Set(state.cases.map((item) => item.personId)).size, 24);
  assert.equal(record.supplied, 0);
  assert.equal(reviewCode(state, record), "N");
  assert.equal(record.stage, "Not filed");
  assert.equal(record.closed, false);
  assert.equal(
    state.obligations.some((item) => item.caseId === "C26"),
    false
  );
  assert.equal(initial.cases.length, 25);
});

test("invalid actions fail explicitly and do not mutate the original demo", () => {
  const state = createDemo();
  const before = structuredClone(state);
  assert.throws(
    () =>
      applyAction(state, {
        type: "review",
        caseId: "C01",
        section: "employment",
        checks: [true, false, true],
      }),
    DemoError
  );
  assert.throws(
    () =>
      applyAction(state, {
        type: "request",
        caseId: "C01",
        section: "employment",
        text: "Please confirm.",
        followUp: "2026-10-17",
      }),
    DemoError
  );
  assert.throws(
    () =>
      applyAction(state, {
        type: "deadline",
        caseId: "C02",
        date: "2026-10-28",
        source: "",
      }),
    DemoError
  );
  assert.throws(
    () =>
      applyAction(state, {
        type: "complete",
        obligationId: "V-C14",
        complete: true,
      }),
    DemoError
  );
  assert.deepEqual(state, before);
});

test("category membership is independent from the summary totals and type toggles", () => {
  const state = createDemo();
  assert.equal(
    state.obligations.filter((item) => matchesCategory(item, "past")).length,
    6
  );
  assert.equal(
    state.obligations.filter((item) => matchesCategory(item, "upcoming"))
      .length,
    4
  );
  assert.equal(
    state.obligations.filter((item) => matchesCategory(item, "passport"))
      .length,
    1
  );
  assert.equal(
    state.obligations.filter((item) => matchesCategory(item, "employer"))
      .length,
    3
  );
  assert.equal(
    state.obligations.filter((item) => matchesCategory(item, null)).length,
    state.obligations.length
  );
});

test("expiry windows include today and exact endpoints, but exclude the next day", () => {
  const visa = createDemo().obligations.find((item) => item.id === "V-C02");
  const passport = createDemo().obligations.find((item) => item.id === "P-C18");
  assert.ok(visa);
  assert.ok(passport);
  for (const date of [TODAY, addDays(TODAY, 120)]) {
    assert.equal(complianceCounts([{ ...visa, date }]).upcoming, 1);
  }
  assert.equal(
    complianceCounts([{ ...visa, date: addDays(TODAY, 121) }]).upcoming,
    0
  );
  assert.equal(
    complianceCounts([{ ...visa, date: addDays(TODAY, -1) }]).past,
    1
  );
  assert.equal(
    complianceCounts([{ ...passport, date: "2027-04-18" }]).passport,
    1
  );
  assert.equal(
    complianceCounts([{ ...passport, date: "2027-04-19" }]).passport,
    0
  );
});

test("editing a request follow-up updates its conversation date and keeps a dated Follow-up", () => {
  let state = createDemo();
  const request = requestsFor(state, "C10")[0];
  const task = state.obligations.find((item) => item.requestId === request.id);
  assert.ok(task);
  const action = {
    type: "next-action",
    caseId: "C10",
    taskId: task.id,
    title: "Request follow-up",
    owner: "Client",
    advisor: "JP",
    date: "2026-10-22",
    obligationType: "Follow-up",
  };
  state = applyAction(state, action);
  assert.equal(requestsFor(state, "C10")[0].followUp, "2026-10-22");
  assert.throws(() => applyAction(state, { ...action, date: "" }), DemoError);
  assert.throws(
    () => applyAction(state, { ...action, obligationType: "Internal" }),
    DemoError
  );
});
