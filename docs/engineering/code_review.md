# Code Review Standard

## Review goals
- Correctness
- Scope discipline
- Simplicity
- Maintainability
- Safety of permissions and AI grounding

## Reviewer checklist
- Does the change satisfy the issue without adding hidden scope?
- Are auth and permissions handled correctly?
- Does any AI path preserve citations / grounding?
- Are DM/player visibility rules preserved?
- Are loading/error/empty states present for UI?
- Are tests meaningful and targeted?
- Are names and abstractions clear?
- Is there any unnecessary dependency or architectural churn?

## Automatic rejection conditions
- Breaks visibility boundaries
- Adds broad scope not in issue
- Introduces unclear abstractions for simple logic
- Omits test coverage for changed behavior
- Ships UI without basic responsive handling