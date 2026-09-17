# PlanDeck

**Review the plan before the code.**

PlanDeck is a terminal UI for reviewing and editing Copilot CLI plans. Each step shows **title**, **why** (reasoning), **what** (actions), and **risks** — all fully editable in your terminal before the agent starts implementing.

---

## Features

- **Per-step reasoning** — a dedicated *Why* field explains the rationale for each step
- **Inline editing** — navigate to any step and edit title, why, what items, and risks
- **Status cycling** — press `s` to cycle a step's status: `pending → in progress → done → blocked`
- **Sequential step execution** — press `x` to implement only the selected step, then return for the next pending step
- **Step-scoped questions** — press `?` to ask about the selected step in a dedicated Copilot session while plan review continues
- **Approve or Request Changes** — `a` to approve and save; `r` to send feedback text back to Copilot
- **No browser required** — runs entirely in your terminal

---

## Installation

PlanDeck is not currently published to npm. Clone or download this repository, then run the
included installer from PowerShell:

```powershell
.\install.ps1
```

The installer:

- installs the Node.js dependencies
- links the `plandeck` command globally with npm
- installs the bundled Copilot skill at
  `%USERPROFILE%\.copilot\skills\plandeck\SKILL.md`

Node.js and npm must already be installed. To update an existing installation, pull or replace the
repository files and run `.\install.ps1` again.

For manual installation:

```powershell
npm install
npm link
New-Item -ItemType Directory "$HOME\.copilot\skills\plandeck" -Force
Copy-Item ".\skills\plandeck\SKILL.md" "$HOME\.copilot\skills\plandeck\SKILL.md" -Force
```

## Usage

Open any plan file (YAML or Markdown) in the terminal editor:

```bash
plandeck plan.yaml
plandeck plan.md

# Start with a blank plan
plandeck

# Write a machine-readable decision for an integrating agent
plandeck plan.yaml --result-file plan.result.json

# Mark one previously selected step done and reopen on the next pending step
plandeck plan.yaml --complete-step step-id --result-file plan.result.json
```

### Keyboard shortcuts

**List view**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate steps |
| `Enter` | Edit selected step |
| `s` | Cycle status of selected step |
| `x` | Execute only the selected step and mark it in progress (saves and exits) |
| `?` | Ask a question about the selected step in a dedicated Copilot session |
| `a` | Approve the full plan (saves and exits) |
| `r` | Request changes (enter feedback text) |
| `q` | Quit without a decision |

**Edit view** (after pressing Enter on a step)

| Key | Action |
|-----|--------|
| `Tab` | Move to next field |
| `Shift+Tab` | Move to previous field |
| `Enter` | Save (when focused on *Save & Return* button) |
| `Esc` | Cancel edits, return to list |

In the *What* list, pressing `Enter` on *+ Add item* appends a new action. Pressing `Backspace` on an empty item removes it.

---

## Exit codes and output

The tool writes its outcome to **stderr** so it can be consumed by Copilot:

- `✓ Plan approved and saved to: <path>` — user approved; plan saved to disk
- `▶ Step selected for execution: <title>` — user wants only the selected step implemented
- `? Question submitted for step: <title>` — user wants an explanation in a dedicated session
- `⟳ Changes requested:` followed by feedback text — user wants changes
- `✕ PlanDeck closed without a decision.` — user quit

Pass `--result-file <path>` to also write the decision atomically as JSON. The `decision` field is
`approved`, `execute_step`, `ask_step`, `changes_requested`, or `dismissed`. Execution decisions
include `stepId` and the complete `step`. Question decisions include those fields plus `question`;
the saved `planFile` supplies the full plan context to the dedicated session. Change requests
include `feedback`. An integrating agent can watch this file to be notified when the TUI exits.

When a single step finishes, the integrating agent passes its exact ID back with `--complete-step`.
PlanDeck verifies that exactly one matching step is currently `in_progress`, marks only that step
`done`, and reopens with the next `pending` step selected. Quit with `q` whenever you want to stop
the sequence.

---

## Copilot skill

The bundled skill is stored at `skills\plandeck\SKILL.md`. The installer copies it to the user's
Copilot skills directory. It teaches Copilot to open plans in an interactive terminal canvas and
watch the result file so approvals, questions, and change requests return to the agent
automatically. Step questions open in a coordinated child session while PlanDeck immediately
reopens for continued review.

---

## Plan File Format

Plans are YAML files with the following structure:

```yaml
title: "Add caching to the API"
description: "Full Redis caching implementation"
steps:
  - id: setup-redis
    title: Set up Redis connection
    why: Redis is the fastest option for this stack; connection pooling needed before anything else
    what:
      - Install StackExchange.Redis NuGet package
      - Add IConnectionMultiplexer to DI container
      - Add Redis connection string to appsettings
    risks: Redis not available in dev environment
    status: pending
    dependencies: []
```

The tool also accepts Markdown plans (Copilot CLI's `plan.md` format) and parses todo checkboxes and headings as steps.
