# Working Agreement

## Repo workflow
- One Linear issue = one branch = one PR
- PRs must stay narrowly scoped
- No direct pushes to `main`
- Prefer multiple small PRs over one large PR
- Branches must follow `dnd-<ticket-number>-description`
- Commit subjects and PR titles must start with `[DND-123]`
- Use `.github/pull_request_template.md` and link the Linear issue in every PR
- Merge to `main` requires passing `ci`, `branch-name`, `commit-message`, and `pr-title`
- Merge to `main` requires one approving CODEOWNER review and resolved review conversations

## Decision hierarchy
1. Linear issue acceptance criteria
2. AGENTS.md
3. PRD
4. Architecture doc
5. Existing codebase patterns

## Change sizing
Aim for:
- Small: 1 file area / single behavior
- Medium: one end-to-end slice
Avoid:
- Broad refactors bundled with feature work
- Unrequested dependency churn

## UI expectations
- Mobile-first
- Responsive at phone and laptop widths
- Empty/loading/error states required
- Accessible labels and keyboard support where relevant

## Backend expectations
- Explicit auth and permission checks
- Avoid hidden side effects
- Prefer traceable workflows over magic abstractions

## AI expectations
- Grounded outputs only
- Retrieval must be inspectable
- Do not bypass visibility rules
- Do not silently mix player and DM contexts

## Testing
Every change should add or update the most relevant tests.
