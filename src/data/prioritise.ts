// Prioritisation rules for the advisor work queue.
// Normalises the messy raw fields at read time (raw rows are left untouched)
// and exposes the sort/filter/highlight rules used by the dashboard.
// TODO: add unit tests (e.g. Vitest) covering normalisers, comparators and isActionable.

export type Row = Record<string, string>;

export type ProfileStatus = "completed" | "in progress" | "not started";

const PROFILE_RANK: Record<ProfileStatus, number> = {
    completed: 0,
    "in progress": 1,
    "not started": 2,
};

// Lower rank = higher priority. Anything at TERMINAL_CASE_RANK is past the
// "Approved/Denied/Filed" threshold and is waiting on someone else.
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

export const EXPIRING_SOON_DAYS = 90;
const MS_PER_DAY = 86_400_000;
const DMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const VISA_NOISE = /[\s-]/g;

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

/** Parses DD/MM/YYYY; returns null for blanks or unparseable values. */
export function parseDate(raw: string): Date | null {
    const m = DMY.exec(raw.trim());
    if (!m) {
        return null;
    }
    const [, d, mo, y] = m;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
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

export function hasVisa(row: Row): boolean {
    return normaliseCaseStatus(row.case_status) === "approved";
}

/** Completed profile and case not yet past the Approved/Denied/Filed threshold. */
export function isActionable(row: Row): boolean {
    return (
        normaliseProfileStatus(row.profile_status) === "completed" &&
        caseRank(row) < TERMINAL_CASE_RANK
    );
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

/** Expiry ascending; rows without an expiry date go last. */
export function compareWithVisa(a: Row, b: Row): number {
    const ea = parseDate(a.expires_at)?.getTime() ?? Number.POSITIVE_INFINITY;
    const eb = parseDate(b.expires_at)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (ea !== eb) {
        return ea < eb ? -1 : 1;
    }
    return a.employee_id.localeCompare(b.employee_id);
}

export type ExpiryState = "expired" | "expiring-soon" | "ok" | "unknown";

export function expiryState(row: Row, today: Date = new Date()): ExpiryState {
    const expires = parseDate(row.expires_at);
    if (!expires) {
        return "unknown";
    }
    const days = (expires.getTime() - today.getTime()) / MS_PER_DAY;
    if (days < 0) {
        return "expired";
    }
    return days <= EXPIRING_SOON_DAYS ? "expiring-soon" : "ok";
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
