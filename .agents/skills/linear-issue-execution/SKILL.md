---
name: linear-issue-execution
description: Execute a bounded Linear issue with strict scope control.
---

# Linear Issue Execution

## Steps
1. Read the issue fully
2. Extract acceptance criteria
3. Extract out-of-scope items
4. Inspect the smallest relevant code area
5. Implement only the scoped change
6. Add/update tests
7. Self-review against code_review.md
8. Prepare concise PR summary

## Rules
- Do not expand scope
- Do not refactor unrelated code
- If requirements are ambiguous, choose the safest narrow implementation