---
name: backend-feature
description: Implement backend features with explicit permissions and test coverage.
---

# Backend Feature Skill

## Requirements
- Explicit auth checks
- Explicit permission checks
- No hidden side effects
- Test changed behavior
- Avoid premature abstractions

## Special rule
If the feature touches campaign data, verify player vs DM visibility at query time and response time.