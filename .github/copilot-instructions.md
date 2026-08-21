# Copilot Instructions

## Project Overview

**PlanDeck** is a terminal UI (TUI) for reviewing and editing Copilot CLI plans. It runs as a **standalone CLI tool** that renders an interactive plan editor directly in the terminal using [ink](https://github.com/vadimdemedes/ink) (React for the terminal). No browser required.

## Running the Project

```bash
npm install
node index.js plan.yaml          # Open a plan file in the TUI
node index.js                    # Start with a blank plan
```

There are no build, test, or lint scripts — the code runs directly with Node.js.

## Architecture

### Mode Dispatch (`index.js`)

`index.js` is a thin dispatcher that reads the plan file argument and delegates to `lib/standalone.js`. All logic lives in `lib/`.

### Data Flow

1. `lib/standalone.js` loads the plan file via `lib/plan-io.js`
2. Calls `runTui(plan)` from `lib/tui.js`, which renders the ink TUI
3. Awaits the Promise returned by `runTui` — resolves when user approves, requests changes, or quits
4. Saves the updated plan back to disk and exits

### TUI (`lib/tui.js`)

Built with ink v3 (React for the terminal, CJS-compatible). Exports a single `runTui(plan)` function that returns a Promise resolving to:
- `{ approved: true, plan }` — user approved
- `{ approved: false, feedback }` — user requested changes
- `{ approved: false, dismissed: true }` — user quit

**Views:**
- **List view** — scrollable step list with status badges; keyboard navigation
- **Edit view** — tabbed fields for title, why, what items, and risks
- **Feedback view** — text input for change-request message

**Key conventions in tui.js:**
- `exitOnCtrlC: false` is passed to `render()` so Ctrl+C can be handled manually
- A `resultRef` (plain object with `.current`) holds the result before calling `app.exit()`; this is the only safe way to pass data out of an ink app
- `useFocus`/`useFocusManager` from ink are used for Tab-based field navigation in the edit view
- `useInput` global handlers are only active in their respective view (components mount/unmount on view change)
- `React.createElement` is used throughout — no JSX (no build step)

### Plan Data Model

```javascript
// Plan
{ title: string, description: string, steps: Step[] }

// Step
{
  id: string,           // e.g. "step-1"
  title: string,
  why: string,          // reasoning field (required)
  what: string[],       // list of actions
  risks: string,
  status: "pending" | "in_progress" | "done" | "blocked",
  dependencies: string[]
}
```

## Plan Presentation Workflow

Whenever a plan is created or updated in `[[PLAN]]` mode, **always open it in PlanDeck** using the `/plandeck` skill. Do **not** present plans as plain text or use `exit_plan_mode`.

Use the `/plandeck` skill — it contains the full instructions for serializing the plan to YAML, opening PlanDeck in a terminal canvas, and reading its result-file handoff.

## Key Conventions

### No Build Step
All files are standard CommonJS (`require`/`module.exports`). Do not introduce transpilation, bundling, or TypeScript. Use `React.createElement` instead of JSX.

### Single Responsibility Per Module
- `plan-io.js` — only parse/serialize/read/write plans
- `tui.js` — only the ink TUI components and `runTui()` entry point
- `standalone.js` — only orchestrate the CLI workflow

### Promise-Based TUI Lifecycle
`runTui(plan)` renders the ink app and returns a Promise. The app calls `app.exit()` once the user makes a decision. Results are passed via a `resultRef` object that is read after `waitUntilExit()` resolves.

### Plan Formats
`plan-io.parsePlan()` accepts both YAML and Markdown. YAML is the canonical output format. Markdown parsing targets Copilot CLI's `plan.md` format (h1 = title, h3 = step headers, checkboxes = steps, bullet points = actions).

### TUI Patterns
- Status cycling uses the ordered constant `STATUS_CYCLE = ['pending', 'in_progress', 'done', 'blocked']`
- Viewport scrolling is implemented manually (no built-in scroll in ink v3)
- All component functions are defined at module level (not inside render functions) to avoid React remounting issues

### Output File Naming
In standalone mode, if the input file ends in `.yaml`, overwrite it in-place. Otherwise (`.md`, no extension), write to a `.plan.yaml` sibling file.
