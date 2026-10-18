// Prioritisation rules for the advisor work queue.
// Normalises the messy raw fields at read time (raw rows are left untouched)
// and exposes the sort/filter/highlight rules used by the dashboard.
// TODO: add unit tests (e.g. Vitest) covering normalisers, comparators and alerts.

export type Row = Record<string, string>;

export type ProfileStatus = "completed" | "in progress" | "not started";

const PROFILE_RANK: Record<ProfileStatus, number> = {
    completed: 0,
    "in progress": 1,
    "not started": 2,
};

// Lower rank = higher priority within the existing baseline work-queue sort.
const CASE_RANK: Record<string, number> = {
    "rfe issued": 0,
    "not filed": 1,
    "in review": 2,
    approved: 3,
    denied: 3,
    filed: 3,
    withdrawn: 3,
};
const TERMINAL_CASE_RANK = 3;
const VISA_NOISE = /[\s-]/g;
const PENDING_CASE_STATUSES = new Set(["not filed", "in review", "rfe issued"]);

export function normaliseProfileStatus(raw: string): ProfileStatus {
    const s = raw.trim().toLowerCase();
    if (s === "completed" || s === "in progress") {
        return s;
    }
    return "not started";
}

/** Uppercase, no spaces/hyphens — so "O1A" and "O-1A" compare equal. */
export function normaliseVisaType(raw: string): string {
    return raw.replace(VISA_NOISE, "").toUpperCase();
}

/** Lowercased case status; blank is treated as "not filed". */
export function normaliseCaseStatus(raw: string): string {
    const s = raw.trim().toLowerCase();
    return s === "" ? "not filed" : s;
}

export function completionPct(row: Row): number {
    const n = Number.parseFloat(row.profile_completion_pct);
    return Number.isFinite(n) ? n : 0;
}

function caseRank(row: Row): number {
    return CASE_RANK[normaliseCaseStatus(row.case_status)] ?? TERMINAL_CASE_RANK;
}

function isO1A(row: Row): boolean {
    return normaliseVisaType(row.visa_type) === "O1A";
}

export function isPendingWork(row: Row): boolean {
    return PENDING_CASE_STATUSES.has(normaliseCaseStatus(row.case_status));
}

export function isActionable(row: Row): boolean {
    const status = normaliseCaseStatus(row.case_status);
    return status === "rfe issued" ||
        (status === "not filed" &&
            normaliseProfileStatus(row.profile_status) === "completed");
}

export function isFollowUp(row: Row): boolean {
    const status = normaliseCaseStatus(row.case_status);
    const profileStatus = normaliseProfileStatus(row.profile_status);
    const completion = completionPct(row);
    return status === "in review" ||
        (profileStatus === "in progress" &&
            (completion >= 80 || completion === 0));
}

export function needsAssignment(row: Row): boolean {
    return row.assigned_advisor.trim() === "";
}

export function comparePendingWork(a: Row, b: Row): number {
    const actionPriority = Number(isActionable(b)) - Number(isActionable(a));
    if (actionPriority !== 0) {
        return actionPriority;
    }
    const followUpPriority = Number(isFollowUp(b)) - Number(isFollowUp(a));
    if (followUpPriority !== 0) {
        return followUpPriority;
    }
    const assignmentPriority =
        Number(needsAssignment(b)) - Number(needsAssignment(a));
    if (assignmentPriority !== 0) {
        return assignmentPriority;
    }
    return compareWithoutVisa(a, b);
}

/** Profile status > (O-1A first within Completed) > case status > completion % desc. */
export function compareWithoutVisa(a: Row, b: Row): number {
    const pa = normaliseProfileStatus(a.profile_status);
    const pb = normaliseProfileStatus(b.profile_status);
    if (pa !== pb) {
        return PROFILE_RANK[pa] - PROFILE_RANK[pb];
    }
    if (pa === "completed") {
        const oa = isO1A(a) ? 0 : 1;
        const ob = isO1A(b) ? 0 : 1;
        if (oa !== ob) {
            return oa - ob;
        }
    }
    const cr = caseRank(a) - caseRank(b);
    if (cr !== 0) {
        return cr;
    }
    const pct = completionPct(b) - completionPct(a);
    if (pct !== 0) {
        return pct;
    }
    return a.employee_id.localeCompare(b.employee_id);
}

export const UNASSIGNED = "__unassigned__";

export function matchesAdvisor(row: Row, advisor: string): boolean {
    if (advisor === "") {
        return true;
    }
    const value = row.assigned_advisor.trim();
    return advisor === UNASSIGNED ? value === "" : value === advisor;
}

export function advisorOptions(rows: Row[]): string[] {
    const names = new Set(
        rows.map((r) => r.assigned_advisor.trim()).filter((n) => n !== "")
    );
    return [...names].sort((a, b) => a.localeCompare(b));
}
