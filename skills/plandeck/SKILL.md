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
- `"decision": "changes_requested"`: use `feedback` to revise the YAML, then reopen it.
- `"decision": "dismissed"`: ask the user how to proceed.
