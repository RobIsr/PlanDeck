const path = require('path');
const fs = require('fs');
const { loadPlanFile, savePlanFile, emptyPlan } = require('./plan-io');
const { runTui } = require('./tui');

/**
 * Run in standalone mode: open a plan file in the terminal UI.
 * @param {string|undefined} planFile  Path to a plan file (YAML or Markdown)
 * @param {{ resultFile?: string }} options
 */
async function run(planFile, options = {}) {
  let plan;
  let outputPath;

  if (planFile) {
    const resolved = path.resolve(planFile);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      process.exit(1);
    }
    plan = loadPlanFile(resolved);
    outputPath = resolved.endsWith('.yaml')
      ? resolved
      : resolved.replace(/\.[^.]+$/, '') + '.plan.yaml';
    console.error(`Loaded plan: "${plan.title}" (${plan.steps.length} steps)`);
  } else {
    plan = emptyPlan('New Plan');
    outputPath = path.join(process.cwd(), 'plan.yaml');
    console.error('No plan file provided. Starting with an empty plan.');
  }

  const result = await runTui(plan);
  let handoff;

  if (result.approved) {
    savePlanFile(result.plan, outputPath);
    handoff = { decision: 'approved', planFile: outputPath };
    console.error(`\n✓ Plan approved and saved to: ${outputPath}`);
  } else if (result.dismissed) {
    handoff = { decision: 'dismissed', planFile: outputPath };
    console.error('\n✕ PlanDeck closed without a decision.');
  } else {
    handoff = { decision: 'changes_requested', planFile: outputPath, feedback: result.feedback };
    console.error(`\n⟳ Changes requested:`);
    console.error(result.feedback);
  }

  if (options.resultFile) {
    writeResultFile(options.resultFile, handoff);
  }

  process.exit(0);
}

function writeResultFile(resultFile, result) {
  const resolved = path.resolve(resultFile);
  const temporary = `${resolved}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  fs.renameSync(temporary, resolved);
}

module.exports = { run };
