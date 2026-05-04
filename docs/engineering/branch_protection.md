# Main Branch Protection

The `main` branch rules must be configured in GitHub repository settings because GitHub does not store branch protection inside the repository.

## Target branch
- Apply this ruleset to `main`

## Pull request requirement
- Require a pull request before merging
- Require branches to be up to date before merging
- Require conversation resolution before merging

## Required reviews
- Require 1 approving review
- Dismiss stale approvals when new commits are pushed
- Require review from Code Owners

## Required checks
Require these GitHub Actions check runs before merge:
- `ci`
- `branch-name`
- `commit-message`
- `pr-title`

## Push restrictions
- Do not allow direct pushes to `main`
- Limit bypasses to repository administrators only when absolutely necessary

## Notes
- `ci` runs on `pull_request`, `push` to `main`, and `merge_group` so protected-branch updates use the same root install, lint, typecheck, test, and build commands.
- `branch-name`, `commit-message`, and `pr-title` run on pull requests to enforce the repository branch, commit, and review naming conventions before merge.
