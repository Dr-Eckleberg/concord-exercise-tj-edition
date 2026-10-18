# Design brief: Waypoint advisor workspace

## Purpose

This design helps an immigration advisor move each case from client intake to filing and compliance.
It replaces a status-based HR table with an action-based workspace.

Reference screens:

| Screen | File | Main job |
|---|---|---|
| My work | `01-my-work.png` | Decide what to do next |
| Profile review | `02-profile-review.png` | Make a profile ready for filing |
| Case register | `03-case-register.png` | Find, compare, and manage cases |
| Compliance | `04-compliance.png` | Manage dates, obligations, and policy change |

## Design principles

### 1. Lead with work, not records

- Start the day with tasks, reviews, follow-ups, and deadlines.
- Show the reason for attention and the next action.
- Keep the full table for comparison and administration.

### 2. Make profile review a primary workflow

- The client supplies the profile information.
- The advisor examines it for accuracy and case strength.
- Show updated sections first, with the related evidence.
- Link each clarification request to a field, section, or document.

### 3. Do not treat completeness as approval

- Show information completeness and advisor readiness as separate signals.
- A 100% profile can still need changes.
- Profile approval is an explicit advisor action.
- Record the approver, profile version, and approval time.
- Request a new review when material information changes.

### 4. Separate profile readiness from application progress

- Show profile readiness, application stage, and next action in separate columns.
- An approved profile moves the case to preparation, not to "Filed".
- Keep government milestones separate from internal targets.

### 5. Make ownership and blockers visible

- Show the responsible person for each next action.
- Identify work that waits on the advisor, client, employer, or authority.
- Show missing deadlines and unassigned cases as work to resolve.

### 6. Keep client scope clear

- Give the portfolio a clear client selector.
- Show the employer next to each person.
- Use the selected scope for every count, list, and filter.

### 7. Model people and cases correctly

- One person can have more than one case.
- Each table row represents one case, not one unique person.
- Flag possible duplicate records for review. Do not merge them automatically.

### 8. Treat compliance as a dated workflow

- Group items by verification need and upcoming date.
- Show employer obligations next to individual renewals.
- Show policy updates with possibly affected cases.
- Require advisor assessment before the system creates client advice.

### 9. Make uncertainty explicit

- Use "Not recorded", "Unknown", and "Needs verification" instead of blank fields.
- Show ambiguous dates with all possible interpretations.
- Do not make a deadline from an unconfirmed date.
- Do not show a recorded expiry as a legal decision about work rights.

### 10. Separate internal and client-visible content

- Label internal notes and client-visible messages clearly.
- Show a client-visible preview before the advisor sends a request.
- Never send reminders automatically from a review action.

### 11. Use quiet, consistent visual language

- Use neutral surfaces and limited status colours.
- Put text labels with all colours.
- Use amber for review, blue for new responses, green for approval, and red for risk.
- Give each screen one primary action at most where possible.

## Success criteria

The design is successful when an advisor can:

- Find the next important task in seconds.
- Know why each item needs attention.
- Review client information against its evidence.
- Request specific corrections without email.
- Approve a profile with a clear audit record.
- Find upcoming renewals and compliance obligations.
- See which data the team must verify.

## Concept limitations

- The images are static design concepts, not a working system.
- Some states, tasks, documents, obligations, and policy items are illustrative.
- The concept does not give legal advice or determine legal status.


## Running it

Two commands:

```bash
bun install
bun run dev
```

Then open the printed `localhost` URL. 
