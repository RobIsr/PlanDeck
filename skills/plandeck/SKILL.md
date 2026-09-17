---
name: plandeck
description: >
  Use this skill when presenting, reviewing, or approving an implementation plan in [[PLAN]] mode.
  Writes the plan to the session files folder and opens it in PlanDeck, a terminal UI that runs
  directly in the user's terminal. Use this instead of presenting plans as plain text.
---

## When to use this skill

Use `/plandeck` whenever an implementation plan needs user review and approval before work
continues.

## Open a plan in PlanDeck

### 1. Serialize the plan to YAML

Write the plan to `current-plan.yaml` in the session files folder:

```yaml
title: "Plan title"
description: "One-sentence description of what this plan achieves"
steps:
  - id: step-1
    title: Step title
    why: Why this step is needed
    what:
      - Action item 1
      - Action item 2
    risks: Any risks or caveats
    status: pending
    dependencies: []
```

Overwrite the file when revising an existing plan.

### 2. Launch the interactive review

PlanDeck requires a TTY. Do not launch it with the `powershell` tool because tool processes are
not interactive.

1. Inspect the `terminal` canvas with `list_canvas_capabilities` if needed.
2. Choose `current-plan.result.json` next to the plan and delete any stale copy.
3. Start this watcher with the `powershell` tool in async mode:

   ```powershell
   while (!(Test-Path -LiteralPath "C:\path\to\current-plan.result.json")) {
     Start-Sleep -Milliseconds 250
   }
   Get-Content -Raw -LiteralPath "C:\path\to\current-plan.result.json"
   ```

4. Open and focus a terminal canvas with a stable instance ID such as `plandeck-review`:

   ```powershell
   plandeck "C:\path\to\current-plan.yaml" --result-file "C:\path\to\current-plan.result.json"
   ```

The watcher completion notifies the agent when the user makes a decision.

### 3. Handle the result

Read the completed watcher with `read_powershell` and parse its JSON:

- `"decision": "approved"`: proceed with implementation.
- `"decision": "execute_step"`: implement only the returned `step`. Do not implement any other
  step, including its dependencies or the next pending step. Do not recreate or manually edit the
  plan YAML while implementing it. After successful implementation and validation, delete the stale
  result file, restart the watcher from step 2, and reopen PlanDeck with:

  ```powershell
  plandeck "C:\path\to\current-plan.yaml" --complete-step "<stepId>" --result-file "C:\path\to\current-plan.result.json"
  ```

  `--complete-step` verifies that exactly one step has the returned ID and that it is currently
  `in_progress`, then marks only that step `done`. PlanDeck automatically selects the next
  `pending` step. Continue this one-step loop until the user approves, requests changes, or
  dismisses PlanDeck. If implementation fails or is blocked, do not run `--complete-step`; report
  the failure to the user instead.
- `"decision": "ask_step"`: create a coordinated child session in the current project for the
  returned `question`. Read the full plan from `planFile` and include it in the kickoff prompt
  together with the returned `step` and the user's exact question. Instruct the child session to
  explain the step and answer the question without implementing changes. Do not wait for the child
  session to finish and do not navigate away from the current session. Delete the stale result
  file, restart the watcher, and immediately reopen PlanDeck with the same plan and result file
  (without `--complete-step`) so review can continue.
- `"decision": "changes_requested"`: use `feedback` to revise the YAML, then reopen it.
- `"decision": "dismissed"`: ask the user how to proceed.
