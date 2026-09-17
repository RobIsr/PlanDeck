#!/usr/bin/env node

const args = process.argv.slice(2);
let planFile;
let resultFile;
let completeStep;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--result-file') {
    resultFile = args[++i];
    if (!resultFile) {
      console.error('Missing path after --result-file.');
      process.exit(1);
    }
  } else if (arg.startsWith('--result-file=')) {
    resultFile = arg.slice('--result-file='.length);
  } else if (arg === '--complete-step') {
    completeStep = args[++i];
    if (!completeStep) {
      console.error('Missing step ID after --complete-step.');
      process.exit(1);
    }
  } else if (arg.startsWith('--complete-step=')) {
    completeStep = arg.slice('--complete-step='.length);
  } else if (arg.startsWith('--')) {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  } else if (!planFile) {
    planFile = arg;
  } else {
    console.error(`Unexpected argument: ${arg}`);
    process.exit(1);
  }
}

require('./lib/standalone').run(planFile, { resultFile, completeStep });
