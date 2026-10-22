export const TODAY = "2026-10-18";
export const CLIENTS = {
  KR: "Kowhai Robotics",
  TB: "Tasman BioHealth",
  SC: "Southern Cross Logistics",
  VC: "Vantage Cloud",
} as const;
export const ADVISORS = {
  AS: "A. Singh",
  JP: "J. Patel",
  ML: "M. Lee",
  "": "Unassigned",
} as const;
export const COUNTRIES = {
  US: "United States",
  NZ: "New Zealand",
  AU: "Australia",
} as const;
export const SECTIONS = {
  personal: "Personal details",
  immigration: "Immigration history",
  employment: "Employment",
  achievements: "Achievements",
  evidence: "Supporting evidence",
} as const;
export const REVIEW_LABELS = {
  U: "Under review",
  Q: "Ready for review",
  C: "Changes requested",
  P: "Approved to proceed",
  N: "Not started",
  X: "Approval not recorded",
} as const;
export const OBLIGATION_TYPES = [
  "Government",
  "Internal",
  "Follow-up",
  "Employer",
  "Visa expiry",
  "Passport",
] as const;
export const POLICY_CASES = ["C03", "C04", "C05", "C09", "C11", "C12", "C13"];
export const POLICY_ID = "fictional-work-visa-guidance";

export type ClientId = keyof typeof CLIENTS;
export type Advisor = keyof typeof ADVISORS;
export type Country = keyof typeof COUNTRIES;
export type SectionId = keyof typeof SECTIONS;
export type ReviewCode = keyof typeof REVIEW_LABELS;
export type Queue = "urgent" | "review" | "waiting" | "ready";
export type AdvisorScope = Advisor | "all";
export type ClientScope = ClientId | "all";
export type ObligationType = (typeof OBLIGATION_TYPES)[number];
export type Owner = "Advisor" | "Client" | "Employer" | "Authority" | "None";
export type Stage =
  | "Not filed"
  | "Filed"
  | "In review"
  | "Evidence requested"
  | "Approved"
  | "Denied"
  | "Withdrawn";
export type HistoryCategory = "Profile" | "Tasks" | "Communication";

export type ProfileField = {
  label: string;
  value: string;
  previous?: string;
  changedVersion?: number;
};
export type MockDocument = {
  name: string;
  version: number;
  summary: string;
};
export type ProfileSection = {
  fields: ProfileField[];
  documents: MockDocument[];
  checks: boolean[];
  checkLabels: string[];
  reviewedVersion: number | null;
  note: string;
};
export type Approval = {
  version: number;
  actor: string;
  date: string;
  order: number;
};
export type CaseRecord = {
  id: string;
  personId: string;
  name: string;
  client: ClientId;
  route: string;
  country: Country;
  advisor: Advisor;
  supplied: number;
  review: "U" | "Q" | "N" | "X";
  stage: Stage;
  closed: boolean;
  preparation: boolean;
  version: number;
  submitted: string;
  sections: Record<SectionId, ProfileSection>;
  approval?: Approval;
  actionTaskId?: string;
  reason: "New application" | "Renewal";
};
export type DemoRequest = {
  id: string;
  caseId: string;
  section: SectionId;
  field?: string;
  body: string;
  followUp: string;
  status: "Open" | "Client replied" | "Resolved";
  response?: string;
  reminderDate?: string;
  messages: {
    id: string;
    actor: "Advisor" | "Client";
    text: string;
    date: string;
    simulated: boolean;
  }[];
};
export type Obligation = {
  id: string;
  caseId?: string;
  client: ClientId;
  title: string;
  type: ObligationType;
  date: string | null;
  owner: Owner;
  advisor: Advisor;
  inheritAdvisor: boolean;
  complete: boolean;
  source: string;
  urgent?: boolean;
  requestId?: string;
  policyId?: string;
  verification?: {
    source: string;
    outcome: "Needs follow-up" | "Updated record checked";
    date: string;
    actor: string;
  };
};
export type HistoryEntry = {
  id: string;
  caseId?: string;
  client: ClientId;
  category: HistoryCategory;
  title: string;
  detail: string;
  date: string;
  order: number;
  visibility: "Internal" | "Client-visible";
};
export type DemoState = {
  cases: CaseRecord[];
  requests: DemoRequest[];
  obligations: Obligation[];
  history: HistoryEntry[];
  sequence: number;
};

export class DemoError extends Error {}

const DAY = 86_400_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WORD_SEPARATOR = /\s+/;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function isDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not recorded";
  }
  const [year, month, day] = value.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function daysFromToday(value: string): number {
  return Math.round(
    (Date.parse(`${value}T00:00:00Z`) - Date.parse(`${TODAY}T00:00:00Z`)) / DAY
  );
}

export function addDays(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
}

export function initials(name: string): string {
  return name
    .replaceAll(",", "")
    .split(WORD_SEPARATOR)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function fictionalEmail(name: string): string {
  const [familyOrGiven, given] = name.split(",");
  const first = (given ?? familyOrGiven).trim().split(WORD_SEPARATOR)[0];
  return `${first.toLowerCase()}@example.test`;
}

export function emailFor(record: CaseRecord): string {
  return fictionalEmail(record.name);
}

export function sectionIds(): SectionId[] {
  return Object.keys(SECTIONS) as SectionId[];
}

function profileSections(
  name: string,
  client: ClientId,
  approved: boolean
): Record<SectionId, ProfileSection> {
  const section = (
    fields: ProfileField[],
    documentName: string
  ): ProfileSection => ({
    fields,
    documents: [
      {
        name: documentName,
        version: 1,
        summary: `Illustrative supporting information for ${name}. This fictional document is provided only to demonstrate the advisor review workflow.`,
      },
    ],
    checks: [approved, approved],
    checkLabels: [
      "Information and evidence reviewed",
      "Advisor assessment of this section",
    ],
    reviewedVersion: approved ? 1 : null,
    note: "",
  });
  return {
    personal: section(
      [
        { label: "Full name", value: name },
        {
          label: "Contact",
          value: fictionalEmail(name),
        },
      ],
      "Personal details summary.pdf"
    ),
    immigration: section(
      [
        {
          label: "Illustrative profile section",
          value:
            "Client immigration history supplied for advisor review. No legal assessment is implied.",
        },
      ],
      "Immigration history summary.pdf"
    ),
    employment: section(
      [
        { label: "Current employer", value: CLIENTS[client] },
        {
          label: "Illustrative profile section",
          value:
            "Employment details and an illustrative employer summary supplied.",
        },
      ],
      "Employer summary.pdf"
    ),
    achievements: section(
      [
        {
          label: "Illustrative profile section",
          value:
            "Professional achievements and contribution summaries supplied for review.",
        },
      ],
      "Achievements summary.pdf"
    ),
    evidence: section(
      [
        {
          label: "Illustrative profile section",
          value: "Supporting evidence supplied for this fictional profile.",
        },
      ],
      "Supporting evidence summary.pdf"
    ),
  };
}

type Seed = [
  string,
  string,
  ClientId,
  string,
  Country,
  Advisor,
  number,
  ReviewCode,
  Stage,
];
const SEEDS: Seed[] = [
  ["C01", "Isabella Santos", "KR", "O-1B", "US", "AS", 100, "U", "Not filed"],
  [
    "C02",
    "Lucas Müller",
    "KR",
    "O-1A",
    "US",
    "AS",
    100,
    "X",
    "Evidence requested",
  ],
  ["C03", "Priya Nair", "KR", "AEWV", "NZ", "JP", 65, "C", "Not filed"],
  ["C04", "Nguyen, Minh", "SC", "AEWV", "NZ", "JP", 100, "P", "Not filed"],
  ["C05", "Mei Lin", "SC", "494", "AU", "", 0, "N", "Not filed"],
  ["C06", "Natasha Ivanova", "KR", "O-1A", "US", "AS", 100, "X", "Filed"],
  ["C07", "Lucia Romano", "KR", "O-1A", "US", "AS", 100, "X", "In review"],
  ["C08", "Omar Farah", "TB", "H-1B", "US", "AS", 100, "Q", "Not filed"],
  ["C09", "Amara Okeke", "TB", "494", "AU", "ML", 100, "Q", "Not filed"],
  ["C10", "Chen, Wei", "KR", "H-1B", "US", "JP", 50, "C", "Not filed"],
  ["C11", "Daniel Okafor", "TB", "482", "AU", "ML", 40, "C", "Not filed"],
  ["C12", "Liam Thompson", "VC", "482", "AU", "ML", 30, "C", "Not filed"],
  ["C13", "Ananya Reddy", "SC", "186", "AU", "ML", 100, "P", "Not filed"],
  ["C14", "Mateo García", "SC", "AEWV", "NZ", "JP", 100, "X", "Approved"],
  ["C15", "Diego Fernández", "VC", "H-1B", "US", "AS", 100, "X", "Approved"],
  ["C16", "Yuki Tanaka", "VC", "H-1B", "US", "AS", 100, "X", "Approved"],
  ["C17", "Carlos Mendoza", "KR", "TN", "US", "AS", 100, "X", "Approved"],
  ["C18", "Grace Wong", "KR", "AEWV", "NZ", "JP", 100, "X", "Approved"],
  ["C19", "Yusuf Demir", "VC", "H-1B", "US", "AS", 100, "X", "Approved"],
  ["C20", "Ahmed Hassan", "SC", "AEWV", "NZ", "JP", 100, "X", "Approved"],
  ["C21", "Jin Park", "SC", "AEWV", "NZ", "JP", 100, "X", "Approved"],
  ["C22", "Tomáš Novák", "VC", "O-1A", "US", "AS", 100, "X", "Approved"],
  ["C23", "Hannah Kim", "VC", "H-1B", "US", "AS", 100, "X", "Denied"],
  ["C24", "Elena Petrova", "VC", "482", "AU", "ML", 100, "X", "Withdrawn"],
  ["C25", "Chen, Wei", "KR", "H-1B", "US", "JP", 100, "P", "Approved"],
];

function caseFromSeed([
  id,
  name,
  client,
  route,
  country,
  advisor,
  supplied,
  review,
  stage,
]: Seed): CaseRecord {
  return {
    id,
    name,
    client,
    route,
    country,
    advisor,
    supplied,
    stage,
    personId: id === "C25" ? "person-C10" : `person-${id}`,
    review: review === "P" || review === "C" ? "U" : review,
    closed: ["C23", "C24", "C25"].includes(id),
    preparation: false,
    version: id === "C01" ? 3 : 1,
    submitted:
      id === "C08" ? "2026-10-17" : id === "C09" ? TODAY : "2026-10-16",
    sections: profileSections(name, client, review === "P"),
    reason: "New application",
  };
}

export function createDemo(): DemoState {
  const state: DemoState = {
    cases: [],
    requests: [],
    obligations: [],
    history: [],
    sequence: 0,
  };
  for (const seed of SEEDS) {
    const record = caseFromSeed(seed);
    const { advisor, supplied, stage } = record;
    const review = seed[7];
    state.cases.push(record);
    log(
      state,
      record,
      "Tasks",
      "Demo case created",
      "Fictional case added to the advisor workspace.",
      "2026-10-10"
    );
    if (supplied > 0) {
      log(
        state,
        record,
        "Profile",
        "Profile submitted",
        `Version ${record.version}; ${supplied}% information supplied.`,
        record.submitted
      );
    }
    if (review === "P") {
      record.approval = {
        actor: ADVISORS[advisor],
        version: 1,
        date: "2026-10-17",
        order: state.sequence + 1,
      };
      log(
        state,
        record,
        "Profile",
        "Profile approved to proceed",
        `Version 1 approved by ${ADVISORS[advisor]}. Application stage remains ${stage}.`,
        "2026-10-17"
      );
    }
  }
  const isabella = requireCase(state, "C01");
  for (const section of Object.values(isabella.sections)) {
    section.documents[0].version = 3;
  }
  for (const id of ["personal", "immigration", "evidence"] as const) {
    isabella.sections[id].reviewedVersion = 3;
    isabella.sections[id].checks = [true, true];
  }
  isabella.sections.immigration.fields = [
    {
      label: "Immigration history",
      value: "Client history supplied; reviewed",
    },
  ];
  isabella.sections.employment = {
    fields: [
      { label: "Current employer", value: CLIENTS.KR },
      { label: "Job title", value: "Marketing Lead" },
      {
        label: "Role and responsibilities",
        value:
          "Leads brand strategy and creative direction for international product launches, including campaign development and production oversight.",
        previous: "Leads marketing campaigns and supports product launches.",
        changedVersion: 3,
      },
    ],
    documents: [
      {
        name: "Employer confirmation letter.pdf",
        version: 3,
        summary:
          "Kowhai Robotics confirms that Isabella Santos is the Marketing Lead. Her illustrative responsibilities include brand strategy, creative direction, and oversight of international launch campaigns. This sample letter supports a review exercise, not a legal conclusion.",
      },
      {
        name: "Employment agreement.pdf",
        version: 2,
        summary:
          "Illustrative employment agreement between Kowhai Robotics and Isabella Santos, Marketing Lead. This previously reviewed sample describes marketing campaign responsibilities. Compare it with the revised role description and new employer letter.",
      },
    ],
    checks: [true, true, false],
    checkLabels: [
      "Information and evidence are consistent",
      "Role description clarified",
      "Advisor assessment of this section",
    ],
    reviewedVersion: null,
    note: "Compare the revised role description against the employer letter before completing this section's review.",
  };
  isabella.sections.achievements = {
    fields: [
      {
        label: "Professional achievements",
        value:
          "Portfolio of three international launch campaigns; contribution summaries supplied.",
        previous: "Campaign portfolio supplied.",
        changedVersion: 3,
      },
    ],
    documents: [
      {
        name: "Campaign portfolio.pdf",
        version: 3,
        summary:
          "An illustrative portfolio of three international launch campaigns. Contribution summaries describe Isabella's brand strategy and creative direction work.",
      },
    ],
    checks: [true, true, false],
    checkLabels: [
      "Information and evidence are consistent",
      "Contribution summaries reviewed",
      "Advisor assessment of this section",
    ],
    reviewedVersion: null,
    note: "",
  };
  isabella.sections.evidence.documents = [
    ...isabella.sections.employment.documents,
  ];
  log(
    state,
    isabella,
    "Profile",
    "Previous profile version 2",
    "Earlier responsibilities and campaign portfolio supplied.",
    "2026-10-12"
  );
  seedRequest(
    state,
    "C01",
    "employment",
    "Please clarify your creative responsibilities and provide an employer letter supporting the description.",
    "2026-10-16",
    "Updated responsibilities and letter added."
  );
  seedRequest(
    state,
    "C10",
    "employment",
    "Please clarify your employment history and provide the remaining dates.",
    TODAY
  );
  seedRequest(
    state,
    "C03",
    "personal",
    "Please provide the remaining profile information.",
    "2026-10-20"
  );
  seedRequest(
    state,
    "C11",
    "employment",
    "Please provide the remaining employer evidence.",
    "2026-10-23"
  );
  seedRequest(
    state,
    "C12",
    "immigration",
    "Please complete your immigration history.",
    "2026-10-26"
  );
  addObligation(state, {
    id: "T02",
    caseId: "C02",
    title: "Confirm evidence-response deadline",
    type: "Government",
    date: null,
    urgent: true,
  });
  addObligation(state, {
    id: "T07",
    caseId: "C07",
    title: "Set next action",
    type: "Internal",
    date: null,
    urgent: true,
  });
  const expiries = [
    ["C14", "2025-12-01"],
    ["C15", "2026-05-30"],
    ["C16", "2026-06-28"],
    ["C17", "2026-07-10"],
    ["C18", "2026-08-20"],
    ["C19", "2026-09-05"],
    ["C02", "2026-12-31"],
    ["C20", "2027-01-09"],
    ["C21", "2027-02-01"],
    ["C22", "2027-02-14"],
  ];
  for (const [caseId, date] of expiries) {
    addObligation(state, {
      id: `V-${caseId}`,
      caseId,
      title: "Recorded visa expiry",
      type: "Visa expiry",
      date,
    });
  }
  addObligation(state, {
    id: "P-C18",
    caseId: "C18",
    title: "Passport expiry",
    type: "Passport",
    date: "2027-03-15",
  });
  addObligation(state, {
    id: "I1",
    caseId: "C06",
    title: "Internal case check-in",
    type: "Internal",
    date: "2026-10-19",
  });
  addObligation(state, {
    id: "I2",
    caseId: "C10",
    title: "Client check-in",
    type: "Follow-up",
    date: "2026-10-21",
  });
  addObligation(state, {
    id: "I3",
    client: "KR",
    advisor: "AS",
    title: "Renewal planning check-in",
    type: "Internal",
    date: "2026-10-22",
  });
  addObligation(state, {
    id: "E1",
    client: "KR",
    advisor: "AS",
    title: "Sponsor reporting check",
    type: "Employer",
    date: "2026-10-30",
  });
  addObligation(state, {
    id: "E2",
    client: "TB",
    advisor: "ML",
    title: "Sponsorship renewal planning",
    type: "Employer",
    date: "2026-11-02",
  });
  addObligation(state, {
    id: "E3",
    client: "SC",
    advisor: "JP",
    title: "Right-to-work records review",
    type: "Employer",
    date: "2026-10-28",
  });
  return state;
}

function nextId(state: DemoState, prefix: string): string {
  state.sequence += 1;
  return `${prefix}-${state.sequence}`;
}

function log(
  state: DemoState,
  record: Pick<CaseRecord, "id" | "client">,
  category: HistoryCategory,
  title: string,
  detail: string,
  date = TODAY,
  visibility: HistoryEntry["visibility"] = "Internal"
): void {
  const id = nextId(state, "H");
  state.history.push({
    id,
    caseId: record.id || undefined,
    client: record.client,
    category,
    title,
    detail,
    date,
    order: state.sequence,
    visibility,
  });
}

function requireCase(state: DemoState, id: string): CaseRecord {
  const record = state.cases.find((item) => item.id === id);
  if (!record) {
    throw new DemoError("This demo case could not be found.");
  }
  return record;
}

function requireObligation(state: DemoState, id: string): Obligation {
  const item = state.obligations.find((entry) => entry.id === id);
  if (!item) {
    throw new DemoError("This obligation could not be found.");
  }
  return item;
}

function requireRequest(state: DemoState, id: string): DemoRequest {
  const request = state.requests.find((item) => item.id === id);
  if (!request) {
    throw new DemoError("This request could not be found.");
  }
  return request;
}

function addObligation(
  state: DemoState,
  values: Partial<Obligation> &
    Pick<Obligation, "id" | "title" | "type" | "date">
): Obligation {
  const record = values.caseId ? requireCase(state, values.caseId) : undefined;
  const item: Obligation = {
    client: record?.client ?? "KR",
    advisor: record?.advisor ?? "",
    owner: "Advisor",
    inheritAdvisor: Boolean(record),
    complete: false,
    source:
      values.type === "Employer" || values.type === "Internal"
        ? "Fictional internal planning check; not a verified statutory deadline."
        : "Confirmed fictional fixture date; not a legal determination.",
    ...values,
  };
  state.obligations.push(item);
  return item;
}

function seedRequest(
  state: DemoState,
  caseId: string,
  section: SectionId,
  body: string,
  followUp: string,
  response?: string
): void {
  const record = requireCase(state, caseId);
  const id = nextId(state, "R");
  state.requests.push({
    id,
    caseId,
    section,
    body,
    followUp,
    response,
    status: response ? "Client replied" : "Open",
    messages: [
      {
        id: nextId(state, "M"),
        actor: "Advisor",
        text: body,
        date: "2026-10-14",
        simulated: true,
      },
      ...(response
        ? [
            {
              id: nextId(state, "M"),
              actor: "Client" as const,
              text: response,
              date: "2026-10-16",
              simulated: true,
            },
          ]
        : []),
    ],
  });
  log(
    state,
    record,
    "Communication",
    "Clarification requested",
    body,
    "2026-10-14",
    "Client-visible"
  );
  if (response) {
    log(
      state,
      record,
      "Communication",
      "Client replied",
      response,
      "2026-10-16",
      "Client-visible"
    );
  } else {
    addObligation(state, {
      id: `F-${id}`,
      caseId,
      title: "Request follow-up",
      type: "Follow-up",
      date: followUp,
      requestId: id,
      owner: "Client",
    });
  }
}

export function requestsFor(state: DemoState, caseId: string): DemoRequest[] {
  return state.requests.filter((item) => item.caseId === caseId);
}

export function reviewCode(state: DemoState, record: CaseRecord): ReviewCode {
  const open = requestsFor(state, record.id).filter(
    (item) => item.status !== "Resolved"
  );
  if (open.some((item) => item.status === "Open")) {
    return "C";
  }
  if (open.length > 0) {
    return record.review === "Q" ? "Q" : "U";
  }
  return record.approval ? "P" : record.review;
}

export function pendingSections(record: CaseRecord): SectionId[] {
  return sectionIds().filter(
    (id) => record.sections[id].reviewedVersion === null
  );
}

export function changedSections(record: CaseRecord): SectionId[] {
  return sectionIds().filter(
    (id) =>
      record.sections[id].reviewedVersion === null &&
      record.sections[id].fields.some((field) => field.changedVersion)
  );
}

export function approvalBlockers(
  state: DemoState,
  record: CaseRecord
): string[] {
  return [
    ...(record.supplied < 100 ? ["Information is incomplete"] : []),
    ...pendingSections(record).map((id) => `${SECTIONS[id]} needs review`),
    ...requestsFor(state, record.id)
      .filter((item) => item.status !== "Resolved")
      .map((item) => `${SECTIONS[item.section]} request is unresolved`),
    ...(record.advisor ? [] : ["Assign an advisor"]),
  ];
}

export function caseInScope(
  record: CaseRecord,
  client: ClientScope,
  advisor: AdvisorScope = "all"
): boolean {
  return (
    (client === "all" || record.client === client) &&
    (advisor === "all" || record.advisor === advisor)
  );
}

export function queueCases(
  state: DemoState,
  queue: Queue,
  client: ClientScope = "all",
  advisor: AdvisorScope = "all"
): CaseRecord[] {
  return state.cases.filter((record) => {
    if (record.closed || !caseInScope(record, client, advisor)) {
      return false;
    }
    const code = reviewCode(state, record);
    if (queue === "urgent") {
      return state.obligations.some(
        (item) => item.caseId === record.id && item.urgent && !item.complete
      );
    }
    if (queue === "review") {
      return code === "U" || code === "Q";
    }
    if (queue === "waiting") {
      return code === "C";
    }
    return code === "P" && record.stage === "Not filed" && !record.preparation;
  });
}

export function obligationsInScope(
  state: DemoState,
  client: ClientScope,
  advisor: AdvisorScope = "all"
): Obligation[] {
  return state.obligations.filter((item) => {
    const record = state.cases.find((entry) => entry.id === item.caseId);
    const owner = item.inheritAdvisor && record ? record.advisor : item.advisor;
    return (
      (client === "all" || item.client === client) &&
      (advisor === "all" || owner === advisor)
    );
  });
}

export function complianceCounts(
  items: Obligation[]
): Record<"past" | "upcoming" | "passport" | "employer", number> {
  const open = items.filter((item) => !item.complete && item.date);
  return {
    past: open.filter(
      (item) => item.type === "Visa expiry" && item.date && item.date < TODAY
    ).length,
    upcoming: open.filter(
      (item) =>
        item.type === "Visa expiry" &&
        item.date &&
        daysFromToday(item.date) >= 0 &&
        daysFromToday(item.date) <= 120
    ).length,
    passport: open.filter(
      (item) =>
        item.type === "Passport" &&
        item.date &&
        item.date >= TODAY &&
        item.date <= "2027-04-18"
    ).length,
    employer: open.filter((item) => item.type === "Employer").length,
  };
}

export function matchesCategory(
  item: Obligation,
  category: "past" | "upcoming" | "passport" | "employer" | null
): boolean {
  if (!category) {
    return true;
  }
  if (category === "employer") {
    return item.type === "Employer";
  }
  if (!item.date) {
    return false;
  }
  if (category === "past") {
    return item.type === "Visa expiry" && item.date < TODAY;
  }
  if (category === "passport") {
    return (
      item.type === "Passport" &&
      item.date >= TODAY &&
      item.date <= "2027-04-18"
    );
  }
  return (
    item.type === "Visa expiry" &&
    daysFromToday(item.date) >= 0 &&
    daysFromToday(item.date) <= 120
  );
}

export function nextDeadline(
  state: DemoState,
  record: CaseRecord
): Obligation | undefined {
  return state.obligations
    .filter(
      (item) =>
        item.caseId === record.id &&
        !item.complete &&
        item.date &&
        ["Government", "Internal", "Follow-up"].includes(item.type)
    )
    .sort(
      (a, b) =>
        (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id)
    )[0];
}

export function needsVerification(
  state: DemoState,
  record: CaseRecord
): boolean {
  return (
    !record.advisor ||
    state.obligations.some(
      (item) =>
        item.caseId === record.id &&
        item.type === "Government" &&
        !item.complete &&
        !item.date
    )
  );
}

export function nextAction(
  state: DemoState,
  record: CaseRecord
): { title: string; owner: Owner; detail: string } {
  if (record.closed) {
    return { title: "Case closed", owner: "None", detail: "Historical case" };
  }
  const urgent = state.obligations.find(
    (item) => item.caseId === record.id && item.urgent && !item.complete
  );
  if (urgent) {
    return {
      title: urgent.title,
      owner: urgent.owner,
      detail: urgent.date ? formatDate(urgent.date) : "Next date not recorded",
    };
  }
  const custom = state.obligations.find(
    (item) => item.id === record.actionTaskId && !item.complete
  );
  if (custom) {
    return {
      title: custom.title,
      owner: custom.owner,
      detail: custom.date ? formatDate(custom.date) : "Date not recorded",
    };
  }
  const code = reviewCode(state, record);
  if (code === "C") {
    return {
      title:
        record.supplied < 100
          ? "Complete profile information"
          : "Respond to clarification",
      owner: "Client",
      detail: "Outstanding client request",
    };
  }
  if (code === "U" || code === "Q") {
    return {
      title: changedSections(record).length
        ? "Review updated profile"
        : "Review submitted profile",
      owner: "Advisor",
      detail: `${changedSections(record).length} sections changed`,
    };
  }
  if (code === "P" && record.stage === "Not filed") {
    return preparationAction(record);
  }

  function preparationAction(record: CaseRecord): {
    title: string;
    owner: Owner;
    detail: string;
  } {
    return {
      title: record.preparation
        ? "Continue application preparation"
        : "Begin application preparation",
      owner: "Advisor",
      detail: record.preparation ? "Preparation started" : "Profile approved",
    };
  }
  if (!record.advisor) {
    return {
      title: "Assign an advisor",
      owner: "Advisor",
      detail: "Unassigned",
    };
  }
  const dated = state.obligations.some(
    (item) => item.caseId === record.id && item.date && !item.complete
  );
  return {
    title: dated ? "Monitor recorded dates" : "Review next milestone",
    owner: ["Filed", "In review", "Evidence requested"].includes(record.stage)
      ? "Authority"
      : "None",
    detail: "No additional queue item",
  };
}

export type DemoAction =
  | { type: "open-review"; caseId: string }
  | { type: "review"; caseId: string; section: SectionId; checks: boolean[] }
  | { type: "reopen-section"; caseId: string; section: SectionId }
  | { type: "note"; caseId: string; section: SectionId; text: string }
  | { type: "approve"; caseId: string }
  | {
      type: "request";
      caseId: string;
      section: SectionId;
      field?: string;
      text: string;
      followUp: string;
    }
  | { type: "message"; requestId: string; text: string }
  | { type: "resolve-request"; requestId: string }
  | { type: "reopen-request"; requestId: string }
  | { type: "assign"; caseId: string; advisor: Advisor }
  | {
      type: "next-action";
      caseId: string;
      taskId?: string;
      title: string;
      owner: Owner;
      advisor: Advisor;
      date: string;
      obligationType: "Internal" | "Follow-up";
    }
  | { type: "deadline"; caseId: string; date: string; source: string }
  | { type: "complete"; obligationId: string; complete: boolean }
  | { type: "prepare"; caseId: string }
  | {
      type: "new-case";
      personId: string;
      route: string;
      country: Country;
      advisor: Advisor;
      reason: "New application" | "Renewal";
    }
  | {
      type: "verify";
      obligationId: string;
      source: string;
      outcome: "Needs follow-up" | "Updated record checked";
      replacement: string;
    }
  | {
      type: "planning";
      obligationId?: string;
      caseId?: string;
      client: ClientId;
      title: string;
      advisor: Advisor;
      date: string;
      obligationType: "Internal" | "Follow-up" | "Employer";
      source: string;
    }
  | { type: "simulate"; caseId: string; section: SectionId }
  | {
      type: "policy-tasks";
      caseIds: string[];
      title: string;
      advisor: Advisor | "case";
      date: string;
    }
  | { type: "policy-message"; caseIds: string[]; text: string };

function textRequired(value: string, max: number, label: string): string {
  const text = value.trim();
  if (!text || text.length > max) {
    throw new DemoError(`${label} must contain 1-${max} characters.`);
  }
  return text;
}

function dateRequired(value: string): void {
  if (!isDate(value)) {
    throw new DemoError("Choose an exact calendar date.");
  }
}

function invalidateApproval(record: CaseRecord): void {
  record.approval = undefined;
  record.review = "U";
}

type ActionType<T extends DemoAction["type"]> = Extract<
  DemoAction,
  { type: T }
>;
type CaseAction = Exclude<
  DemoAction,
  ActionType<
    | "new-case"
    | "policy-tasks"
    | "policy-message"
    | "planning"
    | "complete"
    | "verify"
    | "message"
    | "resolve-request"
    | "reopen-request"
  >
>;

export function applyAction(current: DemoState, action: DemoAction): DemoState {
  const state = structuredClone(current);
  switch (action.type) {
    case "new-case":
      return createDraft(state, action);
    case "policy-tasks":
    case "policy-message":
      return applyPolicyAction(state, action);
    case "planning":
      return savePlanning(state, action);
    case "complete":
    case "verify":
      return applyDateAction(state, action);
    case "message":
    case "resolve-request":
    case "reopen-request":
      return applyRequestAction(state, action);
    default:
      return applyCaseAction(state, action);
  }
}

function createDraft(
  state: DemoState,
  action: ActionType<"new-case">
): DemoState {
  const person = state.cases.find((item) => item.personId === action.personId);
  if (!person) {
    throw new DemoError("Select an existing person.");
  }
  if (!Object.hasOwn(COUNTRIES, action.country)) {
    throw new DemoError("Choose a country.");
  }
  const route = textRequired(action.route, 40, "Route");
  const number =
    Math.max(...state.cases.map((item) => Number(item.id.slice(1)))) + 1;
  const id = `C${String(number).padStart(2, "0")}`;
  const record: CaseRecord = {
    id,
    personId: person.personId,
    name: person.name,
    client: person.client,
    route,
    country: action.country,
    advisor: action.advisor,
    reason: action.reason,
    supplied: 0,
    review: "N",
    stage: "Not filed",
    closed: false,
    preparation: false,
    version: 1,
    submitted: TODAY,
    sections: profileSections(person.name, person.client, false),
  };
  state.cases.push(record);
  log(
    state,
    record,
    "Tasks",
    "Demo draft created",
    `${action.reason}; ${route} / ${COUNTRIES[action.country]}. Not filed.`
  );
  return state;
}

function applyPolicyAction(
  state: DemoState,
  action: ActionType<"policy-tasks" | "policy-message">
): DemoState {
  if (
    !action.caseIds.length ||
    action.caseIds.some((id) => !POLICY_CASES.includes(id))
  ) {
    throw new DemoError("Select at least one candidate case.");
  }
  if (action.type === "policy-tasks") {
    dateRequired(action.date);
    const title = textRequired(action.title, 200, "Task title");
    for (const caseId of new Set(action.caseIds)) {
      const record = requireCase(state, caseId);
      const advisor =
        action.advisor === "case" ? record.advisor : action.advisor;
      if (!advisor) {
        throw new DemoError(`Assign an explicit task owner for ${caseId}.`);
      }
      if (
        state.obligations.some(
          (item) => item.caseId === caseId && item.policyId === POLICY_ID
        )
      ) {
        continue;
      }
      addObligation(state, {
        id: nextId(state, "T"),
        caseId,
        title,
        advisor,
        date: action.date,
        type: "Internal",
        policyId: POLICY_ID,
        inheritAdvisor: action.advisor === "case",
        source:
          "Fictional policy example; advisor assessment required, not verified advice.",
      });
      log(
        state,
        record,
        "Tasks",
        "Policy review task created",
        `${title}; target ${formatDate(action.date)}; owner ${ADVISORS[advisor]}.`
      );
    }
  } else {
    const text = textRequired(action.text, 2000, "Message");
    for (const caseId of new Set(action.caseIds)) {
      const record = requireCase(state, caseId);
      log(
        state,
        record,
        "Communication",
        "Simulated policy message recorded",
        `To ${emailFor(record)}: ${text}. Nothing sent; not verified advice.`,
        TODAY,
        "Client-visible"
      );
    }
  }
  return state;
}

function savePlanning(
  state: DemoState,
  action: ActionType<"planning">
): DemoState {
  const title = textRequired(action.title, 200, "Title");
  dateRequired(action.date);
  if (!action.advisor) {
    throw new DemoError("Assign an owner for this planning obligation.");
  }
  if (action.source.length > 200) {
    throw new DemoError("Source note must be 200 characters or fewer.");
  }
  const existing = action.obligationId
    ? requireObligation(state, action.obligationId)
    : undefined;
  if (
    existing &&
    !["Internal", "Follow-up", "Employer"].includes(existing.type)
  ) {
    throw new DemoError(
      "Use the verification or government deadline workflow for this date."
    );
  }
  const values = {
    client: action.client,
    title,
    advisor: action.advisor,
    date: action.date,
    type: action.obligationType,
    source: action.source || "Internal planning; not a statutory deadline.",
    inheritAdvisor: false,
  };
  if (existing) {
    Object.assign(existing, values);
  } else {
    addObligation(state, {
      id: nextId(state, "O"),
      caseId: action.caseId,
      ...values,
    });
  }
  log(
    state,
    { id: action.caseId ?? existing?.caseId ?? "", client: action.client },
    "Tasks",
    existing ? "Planning details updated" : "Planning obligation added",
    `${title}; ${formatDate(action.date)}; ${ADVISORS[action.advisor]}.`
  );
  return state;
}

function applyDateAction(
  state: DemoState,
  action: ActionType<"complete" | "verify">
): DemoState {
  const item = requireObligation(state, action.obligationId);
  const record = item.caseId
    ? requireCase(state, item.caseId)
    : { id: "", client: item.client };
  if (action.type === "complete") {
    if (item.type === "Visa expiry" || item.type === "Passport") {
      throw new DemoError(
        "A recorded expiry is not a task to complete. Use Verify status."
      );
    }
    item.complete = action.complete;
    log(
      state,
      record,
      "Tasks",
      action.complete ? "Task completed in demo" : "Task reopened",
      item.title
    );
  } else {
    if (item.type !== "Visa expiry" && item.type !== "Passport") {
      throw new DemoError("This item is not a recorded expiry.");
    }
    const source = textRequired(action.source, 200, "Source note");
    if (action.replacement) {
      dateRequired(action.replacement);
    }
    const oldDate = item.date;
    item.date = action.replacement || item.date;
    item.verification = {
      source,
      outcome: action.outcome,
      date: TODAY,
      actor: "A. Singh",
    };
    log(
      state,
      record,
      "Tasks",
      "Recorded date verified",
      `${action.outcome}. ${source} Previous: ${formatDate(oldDate)}; recorded: ${formatDate(item.date)}. No legal-status determination.`
    );
  }
  return state;
}

function applyRequestAction(
  state: DemoState,
  action: ActionType<"message" | "resolve-request" | "reopen-request">
): DemoState {
  const request = requireRequest(state, action.requestId);
  const record = requireCase(state, request.caseId);
  if (action.type === "message") {
    const text = textRequired(action.text, 2000, "Message");
    request.messages.push({
      id: nextId(state, "M"),
      actor: "Advisor",
      text,
      date: TODAY,
      simulated: true,
    });
    request.reminderDate = TODAY;
    log(
      state,
      record,
      "Communication",
      "Simulated message recorded",
      text,
      TODAY,
      "Client-visible"
    );
  } else if (action.type === "resolve-request") {
    if (
      request.status !== "Client replied" ||
      record.sections[request.section].reviewedVersion === null
    ) {
      throw new DemoError(
        "Review the associated section and client reply before resolving this request."
      );
    }
    request.status = "Resolved";
    for (const item of state.obligations.filter(
      (entry) => entry.requestId === request.id
    )) {
      item.complete = true;
    }
    record.review = "U";
    log(
      state,
      record,
      "Communication",
      "Request resolved",
      SECTIONS[request.section]
    );
  } else {
    request.status = "Open";
    request.response = undefined;
    invalidateApproval(record);
    for (const item of state.obligations.filter(
      (entry) => entry.requestId === request.id
    )) {
      item.complete = false;
    }
    if (!state.obligations.some((entry) => entry.requestId === request.id)) {
      addObligation(state, {
        id: nextId(state, "F"),
        caseId: record.id,
        title: "Request follow-up",
        type: "Follow-up",
        date: request.followUp,
        requestId: request.id,
        owner: "Client",
      });
    }
    log(
      state,
      record,
      "Communication",
      "Request reopened",
      SECTIONS[request.section]
    );
  }
  return state;
}

function applyCaseAction(state: DemoState, action: CaseAction): DemoState {
  const record = requireCase(state, action.caseId);
  switch (action.type) {
    case "open-review":
      if (record.review === "Q") {
        record.review = "U";
      }
      break;
    case "review":
      return reviewSection(state, record, action);
    case "reopen-section": {
      const section = record.sections[action.section];
      section.reviewedVersion = null;
      section.checks[section.checks.length - 1] = false;
      invalidateApproval(record);
      log(
        state,
        record,
        "Profile",
        "Section review reopened",
        `${SECTIONS[action.section]}; approval invalidated. Application stage unchanged.`
      );
      break;
    }
    case "note":
      if (action.text.length > 2000) {
        throw new DemoError("Internal notes must be 2000 characters or fewer.");
      }
      record.sections[action.section].note = action.text;
      log(
        state,
        record,
        "Profile",
        action.text ? "Internal note saved" : "Internal note cleared",
        `${SECTIONS[action.section]}: ${action.text || "Note cleared."}`
      );
      break;
    case "approve":
      return approveRecord(state, record);
    case "request":
      return createClarification(state, record, action);
    case "assign":
      record.advisor = action.advisor;
      for (const item of state.obligations.filter(
        (entry) => entry.caseId === record.id && entry.inheritAdvisor
      )) {
        item.advisor = action.advisor;
      }
      log(
        state,
        record,
        "Tasks",
        "Advisor assignment updated",
        ADVISORS[action.advisor]
      );
      break;
    case "next-action":
      return saveNextAction(state, record, action);
    case "deadline": {
      dateRequired(action.date);
      const source = textRequired(action.source, 200, "Source note");
      const task = state.obligations.find(
        (item) => item.caseId === record.id && item.type === "Government"
      );
      if (!task) {
        throw new DemoError("The evidence-response task could not be found.");
      }
      task.date = action.date;
      task.source = source;
      task.title = "Prepare evidence response";
      log(
        state,
        record,
        "Tasks",
        "Government response deadline recorded",
        `${formatDate(action.date)}; source: ${source}. Evidence-response task remains open.`
      );
      break;
    }
    case "prepare":
      if (
        reviewCode(state, record) !== "P" ||
        record.stage !== "Not filed" ||
        record.preparation
      ) {
        throw new DemoError(
          "Preparation requires an approved profile and an unfiled application."
        );
      }
      record.preparation = true;
      log(
        state,
        record,
        "Tasks",
        "Demo preparation started",
        "Form preparation is outside this prototype. Application remains Not filed."
      );
      break;
    case "simulate":
      return simulateClientUpdate(state, record, action);
    default: {
      const exhaustive: never = action;
      throw new DemoError(`Unsupported demo action: ${String(exhaustive)}`);
    }
  }
  return state;
}

function reviewSection(
  state: DemoState,
  record: CaseRecord,
  action: ActionType<"review">
): DemoState {
  const section = record.sections[action.section];
  if (
    action.checks.length !== section.checks.length ||
    !action.checks.every(Boolean)
  ) {
    throw new DemoError(
      "Complete every section check before marking it reviewed."
    );
  }
  section.checks = action.checks;
  section.reviewedVersion = record.version;
  if (!record.approval) {
    record.review = "U";
  }
  log(
    state,
    record,
    "Profile",
    "Section reviewed",
    `${SECTIONS[action.section]}; profile version ${record.version}; A. Singh.`
  );
  return state;
}

function approveRecord(state: DemoState, record: CaseRecord): DemoState {
  if (record.approval) {
    throw new DemoError("This profile already has an approval record.");
  }
  if (approvalBlockers(state, record).length) {
    throw new DemoError(
      "Resolve all approval blockers before approving this profile."
    );
  }
  record.approval = {
    actor: "A. Singh",
    version: record.version,
    date: TODAY,
    order: state.sequence + 1,
  };
  log(
    state,
    record,
    "Profile",
    "Profile approved to proceed",
    `Version ${record.version}; approved by A. Singh. Application preparation can begin; application stage remains ${record.stage}.`
  );
  return state;
}

function createClarification(
  state: DemoState,
  record: CaseRecord,
  action: ActionType<"request">
): DemoState {
  const text = textRequired(action.text, 2000, "Message");
  dateRequired(action.followUp);
  if (action.followUp < TODAY) {
    throw new DemoError("Follow-up date must be on or after 18 Oct 2026.");
  }
  const id = nextId(state, "R");
  state.requests.push({
    id,
    caseId: record.id,
    section: action.section,
    field: action.field,
    body: text,
    followUp: action.followUp,
    status: "Open",
    messages: [
      {
        id: nextId(state, "M"),
        actor: "Advisor",
        text,
        date: TODAY,
        simulated: true,
      },
    ],
  });
  addObligation(state, {
    id: nextId(state, "F"),
    caseId: record.id,
    title: "Request follow-up",
    type: "Follow-up",
    date: action.followUp,
    requestId: id,
    owner: "Client",
  });
  invalidateApproval(record);
  log(
    state,
    record,
    "Communication",
    "Simulated clarification request recorded",
    `${SECTIONS[action.section]}: ${text}; follow-up ${formatDate(action.followUp)}. Nothing sent.`,
    TODAY,
    "Client-visible"
  );
  return state;
}

function saveNextAction(
  state: DemoState,
  record: CaseRecord,
  action: ActionType<"next-action">
): DemoState {
  const title = textRequired(action.title, 200, "Next action");
  if (action.date) {
    dateRequired(action.date);
  }
  if (action.owner === "Advisor" && !action.advisor) {
    throw new DemoError("Select an advisor for this action.");
  }
  const existing = action.taskId
    ? requireObligation(state, action.taskId)
    : undefined;
  const replacesUrgent = Boolean(existing?.urgent && record.id === "C07");
  if (existing && replacesUrgent) {
    existing.complete = true;
  }
  const task =
    existing && !replacesUrgent
      ? existing
      : addObligation(state, {
          id: nextId(state, "T"),
          caseId: record.id,
          title,
          type: action.obligationType,
          date: action.date || null,
        });
  Object.assign(task, {
    title,
    owner: action.owner,
    advisor: action.owner === "Advisor" ? action.advisor : record.advisor,
    date: action.date || null,
    type: action.obligationType,
    inheritAdvisor: action.owner !== "Advisor",
  });
  if (task.requestId) {
    if (!action.date) {
      throw new DemoError("A request follow-up must retain an exact date.");
    }
    if (action.obligationType !== "Follow-up") {
      throw new DemoError(
        "A request follow-up must retain its Follow-up type."
      );
    }
    requireRequest(state, task.requestId).followUp = action.date;
  }
  record.actionTaskId = task.id;
  log(
    state,
    record,
    "Tasks",
    "Next action saved",
    `${title}; ${action.owner}; ${formatDate(task.date)}.`
  );
  return state;
}

function simulateClientUpdate(
  state: DemoState,
  record: CaseRecord,
  action: ActionType<"simulate">
): DemoState {
  const section = record.sections[action.section];
  const field = section.fields.at(-1);
  if (!field) {
    throw new DemoError("This section has no client field to update.");
  }
  record.version += 1;
  record.submitted = TODAY;
  field.previous = field.value;
  field.value += " [Updated in demo]";
  field.changedVersion = record.version;
  if (action.section === "evidence") {
    section.documents.push({
      name: `Updated evidence v${record.version}.pdf`,
      version: record.version,
      summary:
        "New illustrative evidence supplied in a simulated client update. Review this document before approving the profile again.",
    });
  }
  section.reviewedVersion = null;
  section.checks = section.checks.map(() => false);
  invalidateApproval(record);
  for (const request of requestsFor(state, record.id).filter(
    (item) => item.section === action.section && item.status !== "Resolved"
  )) {
    request.status = "Client replied";
    request.response = "Updated information added in demo.";
    request.messages.push({
      id: nextId(state, "M"),
      actor: "Client",
      text: request.response,
      date: TODAY,
      simulated: true,
    });
  }
  log(
    state,
    record,
    "Profile",
    "Simulated client update submitted",
    `Version ${record.version}; ${SECTIONS[action.section]} requires a fresh review. Other section decisions and application stage preserved.`
  );
  return state;
}
