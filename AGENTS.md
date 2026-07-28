# AGENTS.md

## Operating Mode

Use low-token, minimal-diff mode by default.

## General Rules

- Do not scan the entire repository unless explicitly requested.
- Read only files directly related to the task.
- Before editing, briefly state the intended files and changes.
- Prefer minimal changes over broad refactoring.
- Do not rename files, restructure folders, or change architecture unless explicitly requested.
- Do not add new dependencies unless there is no reasonable built-in alternative.
- Do not modify formatting-only unrelated files.
- Do not run full test suites unless explicitly requested.
- Prefer targeted checks, type checks, lint checks, or single-script validation.
- Stop after completing the requested task.

## Response Format

After each task, respond with:

1. Files changed
2. Summary of changes
3. Validation performed
4. Remaining risks or next steps

## Project Style

- Keep data files under `public/data`.
- Keep scripts under `scripts`.
- Use Taiwan timezone where relevant.
- For numeric dashboard values, align numbers to the right and format with thousands separators.
- Data update scripts must include bounded retry logic, max 3 attempts.
- Never implement infinite loops.

## Git Workflow

- Only provide git commit / push commands when code was modified.
- When code was modified, use this order:
  1. `git add <changed files>`
  2. `git commit -m "<message>"`
  3. `git pull --rebase origin main`
  4. `git push origin main`
- Do not run `git pull --rebase` while there are unstaged changes.

## Validation

- For UI or TypeScript changes, run `npm run build`.
- For data-related changes, run `python3 scripts/validate_data.py`.
- Do not modify `public/data/*.json` unless the task is explicitly about data generation or update output.

## UI / Language

- Default UI language is Traditional Chinese.
- Keep English and Traditional Chinese i18n labels in sync.
- Infographics should answer an investor question, not exist only for decoration.

## Loop Mode

Use bounded loop mode when the task has objective validation criteria,
such as build success, tests, lint checks, type checks, schema validation,
or reproducible bug behavior.

Loop mode follows this sequence:

1. Define or infer the acceptance criteria.
2. Inspect only the directly relevant files.
3. Make the smallest reasonable change.
4. Run the narrowest relevant validation.
5. If validation fails, identify the first actionable root cause.
6. Apply a minimal corrective change.
7. Repeat validation, up to 3 total correction attempts.
8. Review the final diff before declaring completion.

Do not repeat substantially identical changes without new evidence.

## Completion Status

Every task must end with exactly one status:

- `Completed`: all required acceptance criteria and validation gates passed.
- `Partial`: useful work was completed, but one or more non-critical
  acceptance criteria remain unresolved.
- `Blocked`: the task cannot be completed safely without missing information,
  unavailable credentials, external access, or a broader architectural decision.

Do not declare `Completed` when a required validation command failed or
was skipped.

## Failure and Escalation

- On validation failure, diagnose the concrete error before making another edit.
- Stop after 3 failed correction attempts for the same task.
- Stop earlier when attempts reproduce the same failure without new evidence.
- When blocked, report:
  1. the failing command,
  2. the relevant error,
  3. attempted corrections,
  4. the smallest next action required.

## Context Escalation

- Start with files directly related to the task.
- Read additional files only when imports, references, build errors,
  runtime errors, or data dependencies provide concrete evidence that
  broader context is required.
- Do not perform an unbounded repository-wide scan.

## Validation Integrity

- Do not delete, disable, weaken, or bypass tests or validation to make a task pass.
- Do not modify validation scripts merely to accept invalid output unless
  the task explicitly changes the validation contract.
- Do not introduce `@ts-ignore`, broad `any`, empty exception handlers,
  or unconditional success returns solely to suppress errors.
- Do not skip required validation because of token or time optimization.

## Change Budget

- Keep each correction attempt focused on the current failure.
- Do not combine unrelated cleanup, refactoring, or formatting changes.
- If the required fix implies an architectural change, stop and report
  the proposed change instead of implementing it automatically.

## Side Effects

- Do not deploy, publish, push, merge, delete remote data, or modify
  production resources unless explicitly requested.
- Local validation and local file generation are allowed when required
  by the task.