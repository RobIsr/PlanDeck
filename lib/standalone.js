const path = require('path');
const fs = require('fs');
const { loadPlanFile, savePlanFile, emptyPlan } = require('./plan-io');
const { runTui } = require('./tui');

/**
 * Run in standalone mode: open a plan file in the terminal UI.
 * @param {string|undefined} planFile  Path to a plan file (YAML or Markdown)
 * @param {{ resultFile?: string, completeStep?: string }} options
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

    if (options.completeStep) {
      const matches = plan.steps
        .map((step, index) => ({ step, index }))
        .filter(({ step }) => step.id === options.completeStep);

      if (matches.length !== 1) {
        console.error(
          `Cannot complete step "${options.completeStep}": expected exactly one matching step, found ${matches.length}.`,
        );
        process.exit(1);
        return;
      }

      const { step, index } = matches[0];
      if (step.status !== 'in_progress') {
        console.error(
          `Cannot complete step "${options.completeStep}": expected status "in_progress", found "${step.status}".`,
        );
        process.exit(1);
        return;
      }

      plan.steps[index] = { ...step, status: 'done' };
      savePlanFile(plan, outputPath);
      console.error(`Completed step: ${step.title}`);
    }

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
  } else if (result.executeStep) {
    savePlanFile(result.plan, outputPath);
    handoff = {
      decision: 'execute_step',
      planFile: outputPath,
      stepId: result.executeStep.id,
      step: result.executeStep,
    };
    console.error(`\n▶ Step selected for execution: ${result.executeStep.title}`);
  } else if (result.askStep) {
    savePlanFile(result.plan, outputPath);
    handoff = {
      decision: 'ask_step',
      planFile: outputPath,
      stepId: result.askStep.step.id,
      step: result.askStep.step,
      question: result.askStep.question,
    };
    console.error(`\n? Question submitted for step: ${result.askStep.step.title}`);
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
